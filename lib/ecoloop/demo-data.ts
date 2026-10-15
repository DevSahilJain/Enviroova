import { computeSustainabilityConfidenceScore } from './confidence-score'
import { DEFAULT_ASSUMPTIONS, DISABLED_CONFIG, simulate } from './simulation'
import type {
  Anomaly,
  AnomalySeverity,
  EnergyDataset,
  EnergyPoint,
  EvidenceItem,
  Hypothesis,
  SimulationConfig,
  VerificationRecord,
} from './types'

/**
 * SYNTHETIC DEMONSTRATION DATA.
 * Generated deterministically from a seeded PRNG. None of these values are
 * readings from real DSU (or any other) meters or sensors.
 */

const HOURS = 24 * 7
const START_MS = Date.UTC(2026, 9, 8, 0, 0, 0) // Thu 8 Oct 2026, 00:00 UTC
const HOUR_MS = 3_600_000
const SOURCE = 'Synthetic demo meter'

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WEEKDAY_OCCUPANCY = [
  0.04, 0.03, 0.03, 0.03, 0.04, 0.08, 0.2, 0.5, 0.85, 0.95, 0.95, 0.9, 0.8,
  0.9, 0.95, 0.9, 0.8, 0.55, 0.4, 0.3, 0.2, 0.12, 0.07, 0.05,
]

interface InjectedAnomaly {
  id: string
  title: string
  startHourIndex: number
  durationHours: number
  extraKwh: number
  severity: AnomalySeverity
  hypotheses: Hypothesis[]
  extraEvidence: EvidenceItem[]
}

const INJECTED: InjectedAnomaly[] = [
  {
    id: 'anom-hvac-overnight',
    title: 'Overnight HVAC load well above schedule',
    startHourIndex: 24 + 22, // Fri 9 Oct 22:00 UTC
    durationHours: 6,
    extraKwh: 38,
    severity: 'high',
    extraEvidence: [
      {
        label: 'HVAC schedule state (demo)',
        value: 'Occupied mode active outside the 05:00-20:00 schedule',
        source: 'Synthetic BMS log',
      },
    ],
    hypotheses: [
      {
        cause: 'Occupied-mode schedule override left active',
        confidence: 0.55,
        rationale:
          'Load steps up at the start of the window and holds flat, which matches a manual override rather than weather-driven demand.',
        suggestedCheck: 'Review BMS override log for Friday evening.',
      },
      {
        cause: 'Economizer damper stuck open',
        confidence: 0.25,
        rationale:
          'A stuck damper raises conditioning load but usually tracks outdoor temperature, which the flat profile does not.',
        suggestedCheck: 'Inspect damper position feedback on AHU-2.',
      },
      {
        cause: 'Late event with extended HVAC request',
        confidence: 0.12,
        rationale:
          'Occupancy stayed near its evening baseline, so a large event is unlikely.',
        suggestedCheck: 'Compare against the facilities events calendar.',
      },
    ],
  },
  {
    id: 'anom-equip-weekend',
    title: 'Weekend equipment draw during low occupancy',
    startHourIndex: 72 + 13, // Sun 11 Oct 13:00 UTC
    durationHours: 4,
    extraKwh: 24,
    severity: 'medium',
    extraEvidence: [
      {
        label: 'Plug-load circuit (demo)',
        value: 'Lab panel LP-3 draw 2.1x its weekend median',
        source: 'Synthetic sub-meter',
      },
    ],
    hypotheses: [
      {
        cause: 'Lab equipment left running after a weekday session',
        confidence: 0.5,
        rationale:
          'The excess sits on the equipment circuit while occupancy is near zero.',
        suggestedCheck: 'Walk the lab and check instrument power states.',
      },
      {
        cause: 'Scheduled data-processing job on shared servers',
        confidence: 0.3,
        rationale:
          'Compute jobs produce a bounded block of extra load unrelated to occupancy.',
        suggestedCheck: 'Check the job scheduler for Sunday afternoon runs.',
      },
    ],
  },
  {
    id: 'anom-lighting-night',
    title: 'Pre-dawn lighting load on a weekday',
    startHourIndex: 120 + 2, // Tue 13 Oct 02:00 UTC
    durationHours: 3,
    extraKwh: 14,
    severity: 'low',
    extraEvidence: [
      {
        label: 'Lighting circuit (demo)',
        value: 'Corridor lighting on at 100% with zero occupancy',
        source: 'Synthetic sub-meter',
      },
    ],
    hypotheses: [
      {
        cause: 'Corridor lighting controller schedule fault',
        confidence: 0.45,
        rationale:
          'Lighting load sits at its daytime level while occupancy is minimal.',
        suggestedCheck: 'Verify controller time sync and schedule table.',
      },
      {
        cause: 'Cleaning crew with lights left on',
        confidence: 0.3,
        rationale:
          'Short, repeatable overnight window consistent with custodial shifts.',
        suggestedCheck: 'Confirm cleaning schedule with facilities.',
      },
    ],
  },
]

function isWeekday(ms: number) {
  const day = new Date(ms).getUTCDay()
  return day !== 0 && day !== 6
}

function round(value: number, digits = 1) {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

function buildSeries() {
  const rand = mulberry32(20261008)
  const injectedExtra = new Array<number>(HOURS).fill(0)
  INJECTED.forEach((a) => {
    for (let i = 0; i < a.durationHours; i++) {
      const edge = i === 0 || i === a.durationHours - 1 ? 0.85 : 1
      injectedExtra[a.startHourIndex + i] =
        a.extraKwh * edge * (0.95 + rand() * 0.1)
    }
  })

  const series: EnergyPoint[] = []
  for (let i = 0; i < HOURS; i++) {
    const ms = START_MS + i * HOUR_MS
    const h = new Date(ms).getUTCHours()
    const weekday = isWeekday(ms)
    const occupancy = round(
      weekday ? WEEKDAY_OCCUPANCY[h] : WEEKDAY_OCCUPANCY[h] * 0.2,
      2,
    )
    const weather = 1 + 0.06 * Math.sin((i / 24) * 1.3 + 0.5)

    const hvacScheduled = weekday ? h >= 5 && h < 20 : h >= 8 && h < 16
    const hvac =
      (hvacScheduled ? 95 + 45 * occupancy : weekday ? 55 : 38) * weather
    const lighting =
      9 + 46 * occupancy + (weekday && h >= 7 && h < 21 ? 10 : 0)
    const equipment = 28 + 62 * occupancy
    const other = 18 + 6 * occupancy

    const breakdown = {
      hvacKwh: round(hvac),
      lightingKwh: round(lighting),
      equipmentKwh: round(equipment),
      otherKwh: round(other),
    }
    const expected = round(
      breakdown.hvacKwh +
        breakdown.lightingKwh +
        breakdown.equipmentKwh +
        breakdown.otherKwh,
    )
    const noise = 1 + (rand() - 0.5) * 0.06
    const actual = round(expected * 1.01 * noise + injectedExtra[i])

    series.push({
      timestamp: new Date(ms).toISOString(),
      expectedKwh: expected,
      actualKwh: actual,
      occupancy,
      breakdown,
    })
  }
  return series
}

const fmtClock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })

function buildAnomalies(series: EnergyPoint[]): Anomaly[] {
  return INJECTED.map((a) => {
    const window = series.slice(
      a.startHourIndex,
      a.startHourIndex + a.durationHours,
    )
    const deviations = window.map((p) => p.actualKwh - p.expectedKwh)
    const peak = Math.max(...deviations)
    const peakIndex = deviations.indexOf(peak)
    const excess = deviations.reduce((s, d) => s + d, 0)
    const expectedSum = window.reduce((s, p) => s + p.expectedKwh, 0)
    const meanDev = excess / window.length
    const meanOcc =
      window.reduce((s, p) => s + p.occupancy, 0) / window.length

    const evidence: EvidenceItem[] = [
      {
        label: 'Mean deviation',
        value: `+${meanDev.toFixed(1)} kWh/h (+${((excess / expectedSum) * 100).toFixed(0)}% vs expected)`,
        source: SOURCE,
      },
      {
        label: 'Peak hour',
        value: `+${peak.toFixed(1)} kWh at ${fmtClock(window[peakIndex].timestamp)} UTC`,
        source: SOURCE,
      },
      {
        label: 'Occupancy in window',
        value: `${Math.round(meanOcc * 100)}% of design occupancy`,
        source: 'Synthetic occupancy estimate',
      },
      ...a.extraEvidence,
    ]

    const peakRounded = round(peak)
    const meanDevRounded = round(meanDev)
    const meanDevPctRounded = round((excess / expectedSum) * 100)
    const excessRounded = round(excess)
    const startTimestamp = window[0].timestamp
    const endTimestamp = window[window.length - 1].timestamp

    const confidenceScore = computeSustainabilityConfidenceScore({
      id: a.id,
      title: a.title,
      startTimestamp,
      endTimestamp,
      peakDeviationKwh: peakRounded,
      meanDeviationKwh: meanDevRounded,
      meanDeviationPct: meanDevPctRounded,
      excessKwh: excessRounded,
      evidence,
      hypotheses: a.hypotheses,
      seriesPoints: window,
      referenceTimestamp: series[series.length - 1]?.timestamp,
      isSimulated: true,
    })

    return {
      id: a.id,
      title: a.title,
      startTimestamp,
      endTimestamp,
      severity: a.severity,
      peakDeviationKwh: peakRounded,
      meanDeviationKwh: meanDevRounded,
      meanDeviationPct: meanDevPctRounded,
      excessKwh: excessRounded,
      evidence,
      hypotheses: a.hypotheses,
      confidenceScore,
    }
  })
}

function buildVerification(series: EnergyPoint[]): VerificationRecord[] {
  const pilots: {
    id: string
    label: string
    period: string
    config: SimulationConfig
    observedFactor: number
  }[] = [
    {
      id: 'pilot-lighting',
      label: 'Lighting optimization pilot',
      period: '22-28 Sep 2026 (demo)',
      config: {
        ...DISABLED_CONFIG,
        lighting: { enabled: true, reductionPct: 25 },
      },
      observedFactor: 0.93,
    },
    {
      id: 'pilot-hvac',
      label: 'HVAC night setback pilot',
      period: '29 Sep - 5 Oct 2026 (demo)',
      config: {
        ...DISABLED_CONFIG,
        hvac: { enabled: true, setbackC: 2.5, startHour: 21, endHour: 5 },
      },
      observedFactor: 1.08,
    },
  ]

  return pilots.map((p) => {
    const predicted = simulate(series, p.config).totals.savingsPct
    return {
      id: p.id,
      label: p.label,
      period: p.period,
      config: p.config,
      observedSavingsPct: round(predicted * p.observedFactor, 2),
    }
  })
}

let cached: EnergyDataset | null = null

export function getDemoDataset(): EnergyDataset {
  if (cached) return cached
  const series = buildSeries()
  cached = {
    meta: {
      isSynthetic: true,
      datasetLabel: 'Synthetic demonstration data',
      siteName: 'Demo academic building (fictional)',
      timezone: 'UTC',
      periodStart: series[0].timestamp,
      periodEnd: series[series.length - 1].timestamp,
      assumptions: DEFAULT_ASSUMPTIONS,
    },
    series,
    anomalies: buildAnomalies(series),
    verification: buildVerification(series),
  }
  return cached
}

export function getEmptyDataset(): EnergyDataset {
  const full = getDemoDataset()
  return { meta: full.meta, series: [], anomalies: [], verification: [] }
}
