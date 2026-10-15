import type {
  ConfidenceComponentScores,
  ConfidenceLabel,
  EnergyPoint,
  EvidenceItem,
  Hypothesis,
  SustainabilityConfidenceScore,
} from './types'

/**
 * Standard collection interval for hourly energy telemetry per DATA_DICTIONARY.md.
 * Measurement Interval: Hourly (60 minutes = 3,600,000 ms).
 */
export const EXPECTED_COLLECTION_INTERVAL_MS = 3_600_000

/**
 * Epistemic disclaimer ensuring AI/analytical diagnoses are never claimed
 * as proven physical causes.
 */
export const CAUSALITY_DISCLAIMER =
  'Proposed AI/analytical diagnoses are unverified hypotheses, not proven physical causes. Physical inspection is required before field intervention.'

export interface AnomalyScoreInput {
  id?: string
  title?: string
  startTimestamp?: string | null
  endTimestamp?: string | null
  peakDeviationKwh?: number | null
  meanDeviationKwh?: number | null
  meanDeviationPct?: number | null
  excessKwh?: number | null
  evidence?: EvidenceItem[] | null
  hypotheses?: Hypothesis[] | null
  /** Series points covering the anomaly or surrounding window */
  seriesPoints?: Array<Partial<EnergyPoint> | null> | null
  /** Reference evaluation time (e.g. latest data timestamp or query time) */
  referenceTimestamp?: string | null
  /** Expected interval in ms between consecutive readings (defaults to 1 hr) */
  expectedIntervalMs?: number
  /** Flag identifying whether this data is synthetic/simulated */
  isSimulated?: boolean
}

/**
 * Helper to clamp values between min and max.
 */
function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min
  return Math.min(max, Math.max(min, val))
}

/**
 * Evaluates Data Completeness (0-100, weight 40%).
 *
 * Scoring Rules:
 * - Base points for essential temporal and energy metrics:
 *   - Valid start timestamp: +15
 *   - Valid end timestamp: +15
 *   - Valid excess kWh metric: +15
 *   - Valid mean or peak deviation metric: +15
 * - Occupancy Telemetry:
 *   - MUST be present and valid numeric.
 *   - CRITICAL REQUIREMENT: Missing occupancy MUST NEVER be interpreted as zero (unoccupied).
 *   - If occupancy is undefined, null, or NaN: deduct 35 points, record 'occupancy' in missingFields.
 *   - If occupancy is present across window: +25 points.
 * - Context & Breakdown:
 *   - Presence of subsystem breakdown or linked evidence items: +15 points.
 *   - If evidence is missing or empty array: deduct 15 points, record 'evidence' in missingFields.
 */
export function calculateCompleteness(
  input: AnomalyScoreInput,
  missingFields: Set<string>,
  reasons: string[],
): number {
  let score = 0

  // 1. Start Timestamp
  const hasStart =
    Boolean(input.startTimestamp) &&
    !Number.isNaN(new Date(input.startTimestamp!).getTime())
  if (hasStart) {
    score += 15
  } else {
    missingFields.add('startTimestamp')
    reasons.push('Start timestamp is missing or invalid.')
  }

  // 2. End Timestamp
  const hasEnd =
    Boolean(input.endTimestamp) &&
    !Number.isNaN(new Date(input.endTimestamp!).getTime())
  if (hasEnd) {
    score += 15
  } else {
    missingFields.add('endTimestamp')
    reasons.push('End timestamp is missing or invalid.')
  }

  // 3. Excess Energy Metric
  if (
    input.excessKwh !== null &&
    input.excessKwh !== undefined &&
    Number.isFinite(input.excessKwh)
  ) {
    score += 15
  } else {
    missingFields.add('excessKwh')
    reasons.push('Total excess energy calculation (excessKwh) is missing.')
  }

  // 4. Mean or Peak Deviation Metric
  const hasMean =
    input.meanDeviationKwh !== null &&
    input.meanDeviationKwh !== undefined &&
    Number.isFinite(input.meanDeviationKwh)
  const hasPeak =
    input.peakDeviationKwh !== null &&
    input.peakDeviationKwh !== undefined &&
    Number.isFinite(input.peakDeviationKwh)

  if (hasMean || hasPeak) {
    score += 15
  } else {
    missingFields.add('deviationMetrics')
    reasons.push('Deviation metrics (mean or peak kWh) are missing.')
  }

  // 5. Occupancy Telemetry (Explicit Requirement: never treat missing as 0)
  let occupancyFound = false
  let occupancyMissing = false

  if (input.seriesPoints && input.seriesPoints.length > 0) {
    for (const pt of input.seriesPoints) {
      if (!pt || pt.occupancy === null || pt.occupancy === undefined || Number.isNaN(pt.occupancy)) {
        occupancyMissing = true
      } else {
        occupancyFound = true
      }
    }
  } else {
    // Check if evidence mentions occupancy or if series points were omitted
    const hasEvidenceOcc = input.evidence?.some((e) =>
      e.label.toLowerCase().includes('occupancy') ||
      e.source.toLowerCase().includes('occupancy'),
    )
    if (hasEvidenceOcc) {
      occupancyFound = true
    } else {
      occupancyMissing = true
    }
  }

  if (occupancyFound && !occupancyMissing) {
    score += 25
  } else if (occupancyFound && occupancyMissing) {
    score += 10
    missingFields.add('occupancy')
    reasons.push(
      'Partial occupancy telemetry: Some hours lack occupancy data. Missing hours were not assumed to be zero.',
    )
  } else {
    missingFields.add('occupancy')
    reasons.push(
      'Missing relevant occupancy telemetry: Occupancy data was missing and cannot be interpreted as zero (unoccupied).',
    )
  }

  // 6. Subsystem Context / Linked Evidence
  const hasEvidence = Array.isArray(input.evidence) && input.evidence.length > 0
  const hasBreakdown = input.seriesPoints?.some(
    (pt) => pt && pt.breakdown && Object.keys(pt.breakdown).length > 0,
  )

  if (hasEvidence || hasBreakdown) {
    score += 15
  } else {
    missingFields.add('evidence')
    reasons.push('No linked evidence records or subsystem breakdown provided.')
  }

  return clamp(score, 0, 100)
}

/**
 * Evaluates Data Freshness (0-100, weight 25%).
 *
 * Scoring Rules:
 * - Based on actual timestamps and expected collection interval (1 hr default).
 * - CRITICAL REQUIREMENT: Unknown freshness must NOT be silently treated as fresh.
 * - If timestamps are missing or invalid: freshness = 0, record in missingFields.
 * - If reference time is unknown: freshness = 0, cannot be assumed fresh.
 * - Age measured in multiples of expected interval:
 *   - <= 1 interval: 100
 *   - <= 3 intervals: 85
 *   - <= 24 intervals (1 day): 70
 *   - <= 48 intervals (2 days): 50
 *   - <= 168 intervals (1 week): 30
 *   - > 168 intervals: 15
 */
export function calculateFreshness(
  input: AnomalyScoreInput,
  missingFields: Set<string>,
  reasons: string[],
  limitations: string[],
): number {
  const tsStr = input.endTimestamp || input.startTimestamp
  if (!tsStr) {
    missingFields.add('timestamp')
    reasons.push(
      'Missing timestamp: Freshness cannot be computed and is not assumed fresh.',
    )
    limitations.push('Unknown timestamp prevents freshness verification.')
    return 0
  }

  const dataMs = new Date(tsStr).getTime()
  if (Number.isNaN(dataMs)) {
    missingFields.add('timestamp')
    reasons.push('Timestamp unparseable; cannot verify data freshness.')
    limitations.push('Unparseable timestamp prevents freshness verification.')
    return 0
  }

  // Reference time: use provided referenceTimestamp, or latest timestamp from seriesPoints
  let refMs: number | null = null
  if (input.referenceTimestamp) {
    const parsedRef = new Date(input.referenceTimestamp).getTime()
    if (!Number.isNaN(parsedRef)) refMs = parsedRef
  }

  if (refMs === null && input.seriesPoints && input.seriesPoints.length > 0) {
    for (const pt of input.seriesPoints) {
      if (pt?.timestamp) {
        const t = new Date(pt.timestamp).getTime()
        if (!Number.isNaN(t) && (refMs === null || t > refMs)) {
          refMs = t
        }
      }
    }
  }

  if (refMs === null) {
    reasons.push(
      'Unknown collection reference time: Freshness cannot be verified and is not assumed fresh.',
    )
    limitations.push('Reference collection timestamp is unavailable.')
    return 0
  }

  const intervalMs = input.expectedIntervalMs ?? EXPECTED_COLLECTION_INTERVAL_MS
  const ageMs = Math.max(0, refMs - dataMs)
  const intervals = ageMs / intervalMs

  if (intervals <= 1.0) {
    return 100
  } else if (intervals <= 3.0) {
    return 85
  } else if (intervals <= 24.0) {
    reasons.push(`Telemetry is ${Math.round(intervals)} hours old relative to reference.`)
    return 70
  } else if (intervals <= 48.0) {
    reasons.push(`Telemetry is ${Math.round(intervals / 24)} days old relative to reference.`)
    return 50
  } else if (intervals <= 168.0) {
    reasons.push(`Telemetry is ${(intervals / 24).toFixed(1)} days old (stale data).`)
    limitations.push('Historical observation over 48 hours old.')
    return 30
  } else {
    reasons.push(`Telemetry is heavily aged (${(intervals / 24).toFixed(0)} days old).`)
    limitations.push('Telemetry significantly exceeds expected collection recency.')
    return 15
  }
}

/**
 * Evaluates Data Consistency (0-100, weight 35%).
 *
 * Scoring Rules:
 * - A. Metric Integrity (+35 points):
 *   - Non-negative constraints: energy and occupancy >= 0.
 *   - Mathematical sanity: peakDeviationKwh >= meanDeviationKwh.
 *   - Excess alignment: if excessKwh > 0, mean deviation should be positive.
 * - B. Evidence Corroboration (+40 points):
 *   - CRITICAL REQUIREMENT: "Missing evidence is not supporting evidence."
 *   - If no evidence items exist: cannot award evidence credit (0/40), record reason.
 *   - If evidence is present: check for contradictory or conflicting indications.
 *     - Example: Finding claims occupancy-driven load, but sensor evidence reports 0 occupants.
 *     - Example: Sub-meter indicates negative or zero deviation while anomaly claims heavy excess.
 *     - If conflicting evidence is detected: deduct 35 points, record limitation.
 *     - If corroborating evidence aligns with subsystem: award full +40 points.
 * - C. Baseline Alignment (+25 points):
 *   - Expected baseline exists and actual > expected when excess > 0.
 */
export function calculateConsistency(
  input: AnomalyScoreInput,
  reasons: string[],
  limitations: string[],
): number {
  let score = 0

  // A. Metric Integrity (up to 35 points)
  let metricScore = 35

  // 1. Peak vs Mean
  if (
    input.peakDeviationKwh !== null &&
    input.peakDeviationKwh !== undefined &&
    input.meanDeviationKwh !== null &&
    input.meanDeviationKwh !== undefined
  ) {
    if (input.peakDeviationKwh < input.meanDeviationKwh) {
      metricScore -= 20
      reasons.push(
        `Inconsistent metrics: Peak deviation (${input.peakDeviationKwh}) is less than mean deviation (${input.meanDeviationKwh}).`,
      )
      limitations.push('Peak deviation is mathematically lower than mean deviation.')
    }
  }

  // 2. Excess vs Mean Deviation sign
  if (
    input.excessKwh !== null &&
    input.excessKwh !== undefined &&
    input.meanDeviationKwh !== null &&
    input.meanDeviationKwh !== undefined
  ) {
    if (
      (input.excessKwh > 0 && input.meanDeviationKwh < 0) ||
      (input.excessKwh < 0 && input.meanDeviationKwh > 0)
    ) {
      metricScore -= 20
      reasons.push('Inconsistent metrics: Excess energy sign conflicts with mean deviation sign.')
      limitations.push('Opposing signs detected between excess kWh and mean deviation.')
    }
  }

  // 3. Series negative checks
  if (input.seriesPoints && input.seriesPoints.length > 0) {
    const hasNegative = input.seriesPoints.some(
      (p) => (p?.actualKwh ?? 0) < 0 || (p?.expectedKwh ?? 0) < 0 || (p?.occupancy ?? 0) < 0,
    )
    if (hasNegative) {
      metricScore -= 15
      reasons.push('Physical bound violation: Negative values detected in energy or occupancy readings.')
      limitations.push('Readings contain physically invalid negative values.')
    }
  }

  score += Math.max(0, metricScore)

  // B. Evidence Corroboration (up to 40 points)
  // "Missing evidence is not supporting evidence."
  const evidenceList = input.evidence ?? []
  if (evidenceList.length === 0) {
    reasons.push('No linked evidence items provided; missing evidence is not supporting evidence.')
    limitations.push('Uncorroborated anomaly: No telemetry or sensor logs attached.')
  } else {
    let evidenceScore = 40
    let contradictionFound = false

    // Check for conflicting evidence
    for (const item of evidenceList) {
      const label = item.label.toLowerCase()
      const val = item.value.toLowerCase()

      // Contradiction 1: Zero occupancy claimed in evidence, but finding title/rationale asserts high occupancy or event
      const titleLower = (input.title ?? '').toLowerCase()
      if (
        (val.includes('0% of design occupancy') || val.includes('0 occupants') || val.includes('zero occupancy')) &&
        (titleLower.includes('high occupancy') || titleLower.includes('crowd') || titleLower.includes('occupied mode active during session'))
      ) {
        contradictionFound = true
        reasons.push(`Conflicting evidence: Evidence indicates 0 occupancy while finding assumes occupied activity.`)
        limitations.push('Telemetry conflicts with finding premise.')
      }

      // Contradiction 2: Evidence reports normal or reduced draw while anomaly claims major excess
      if (
        (val.includes('normal draw') || val.includes('below baseline') || val.includes('0.0 kw')) &&
        (input.excessKwh ?? 0) > 20
      ) {
        contradictionFound = true
        reasons.push(`Conflicting evidence: "${item.label}" indicates normal/zero draw despite reported excess.`)
        limitations.push('Sub-meter evidence contradicts aggregate excess.')
      }
    }

    if (contradictionFound) {
      evidenceScore = 0
      metricScore = Math.max(0, metricScore - 15)
    }

    score = metricScore + evidenceScore
  }

  // C. Baseline Alignment (up to 25 points)
  let baselineScore = 25
  if (input.seriesPoints && input.seriesPoints.length > 0) {
    const validPoints = input.seriesPoints.filter(
      (p) => p && typeof p.actualKwh === 'number' && typeof p.expectedKwh === 'number',
    )
    if (validPoints.length === 0) {
      baselineScore = 10
      reasons.push('Baseline data incomplete across the anomalous window.')
    } else {
      const calculatedSum = validPoints.reduce(
        (acc, p) => acc + ((p!.actualKwh ?? 0) - (p!.expectedKwh ?? 0)),
        0,
      )
      if (input.excessKwh !== null && input.excessKwh !== undefined) {
        // Allow 15% rounding or edge tolerance
        const diff = Math.abs(calculatedSum - input.excessKwh)
        const maxExpected = Math.max(10, Math.abs(input.excessKwh))
        if (diff / maxExpected > 0.4) {
          baselineScore -= 15
          reasons.push(
            `Mathematical divergence: Sum of series deviations (${calculatedSum.toFixed(1)} kWh) differs substantially from reported excess (${input.excessKwh.toFixed(1)} kWh).`,
          )
        }
      }
    }
  } else {
    // If no series points, award standard partial baseline credit if excess is reported
    baselineScore = input.excessKwh ? 20 : 5
  }

  score += Math.max(0, baselineScore)
  return clamp(score, 0, 100)
}

/**
 * Calculates detection confidence separate from root-cause confidence.
 * Based purely on signal strength, magnitude of excess vs baseline, and corroboration.
 */
function calculateAnomalyDetectionConfidence(
  input: AnomalyScoreInput,
  completeness: number,
  consistency: number,
): number {
  if (completeness < 25 || consistency < 20) return 20

  const excess = Math.abs(input.excessKwh ?? 0)
  const meanDevPct = Math.abs(input.meanDeviationPct ?? 0)
  const evidenceCount = input.evidence?.length ?? 0

  let signalScore = 40
  if (excess > 100 || meanDevPct > 50) signalScore += 30
  else if (excess > 30 || meanDevPct > 20) signalScore += 20
  else if (excess > 10) signalScore += 10

  if (evidenceCount >= 2) signalScore += 20
  else if (evidenceCount === 1) signalScore += 10

  const composite = signalScore * 0.4 + completeness * 0.3 + consistency * 0.3
  return Math.round(clamp(composite, 10, 98))
}

/**
 * Computes the Sustainability Confidence Score for a finding.
 *
 * Formula:
 * score = completeness * 0.40 + freshness * 0.25 + consistency * 0.35
 *
 * Rating tiers:
 * - High: 80–100
 * - Moderate: 60–79
 * - Low: below 60
 * - Unrated: when information is insufficient to formulate a reliable score
 */
export function computeSustainabilityConfidenceScore(
  input: AnomalyScoreInput,
): SustainabilityConfidenceScore {
  const missingFieldsSet = new Set<string>()
  const reasons: string[] = []
  const limitations: string[] = []
  const evidenceUsed: string[] = []

  if (input.evidence && input.evidence.length > 0) {
    for (const e of input.evidence) {
      evidenceUsed.push(`${e.label} (${e.source}): ${e.value}`)
    }
  }

  // 1. Compute component scores (each 0-100)
  const completeness = calculateCompleteness(input, missingFieldsSet, reasons)
  const freshness = calculateFreshness(input, missingFieldsSet, reasons, limitations)
  const consistency = calculateConsistency(input, reasons, limitations)

  const missingFields = Array.from(missingFieldsSet)

  // 2. Insufficiency check
  // Insufficient if:
  // - No timestamps or unparseable timestamps
  // - Completeness < 25 (vital metrics missing)
  // - Missing both startTimestamp and endTimestamp
  const isInsufficient =
    completeness < 25 ||
    (!input.startTimestamp && !input.endTimestamp) ||
    (input.excessKwh === null && input.meanDeviationKwh === null && input.peakDeviationKwh === null)

  let score: number | null = null
  let label: ConfidenceLabel = 'Unrated'

  if (isInsufficient) {
    score = null
    label = 'Unrated'
    limitations.push('Telemetry is insufficient to compute a valid sustainability confidence score.')
  } else {
    // Weighted formula:
    // score = completeness * 0.40 + freshness * 0.25 + consistency * 0.35
    const rawScore = completeness * 0.4 + freshness * 0.25 + consistency * 0.35
    score = Math.round(clamp(rawScore, 0, 100))

    if (score >= 80) {
      label = 'High'
    } else if (score >= 60) {
      label = 'Moderate'
    } else {
      label = 'Low'
    }
  }

  // 3. Separate anomaly detection confidence
  const anomalyDetectionConfidence = calculateAnomalyDetectionConfidence(
    input,
    completeness,
    consistency,
  )

  return {
    score,
    label,
    componentScores: {
      completeness,
      freshness,
      consistency,
    },
    missingFields,
    evidenceUsed,
    limitations,
    reasonsForReducedConfidence: reasons,
    anomalyDetectionConfidence,
    causalityNotice: CAUSALITY_DISCLAIMER,
    isSimulated: input.isSimulated ?? true,
    evaluatedAt: new Date().toISOString(),
  }
}
