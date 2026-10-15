import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeSustainabilityConfidenceScore,
  calculateCompleteness,
  calculateFreshness,
  calculateConsistency,
  EXPECTED_COLLECTION_INTERVAL_MS,
} from '../lib/ecoloop/confidence-score.ts'
import type { AnomalyScoreInput } from '../lib/ecoloop/confidence-score.ts'

// Standard test fixtures
const NOW_ISO = '2026-10-15T12:00:00Z'
const ONE_HOUR_AGO = '2026-10-15T11:00:00Z'
const FIVE_DAYS_AGO = '2026-10-10T12:00:00Z'

const COMPLETE_CONSISTENT_INPUT: AnomalyScoreInput = {
  id: 'test-anom-01',
  title: 'Overnight HVAC schedule overrun',
  startTimestamp: ONE_HOUR_AGO,
  endTimestamp: NOW_ISO,
  peakDeviationKwh: 45.2,
  meanDeviationKwh: 38.0,
  meanDeviationPct: 120,
  excessKwh: 152.0,
  referenceTimestamp: NOW_ISO,
  expectedIntervalMs: EXPECTED_COLLECTION_INTERVAL_MS,
  evidence: [
    {
      label: 'HVAC fan status',
      value: 'VFD Fan commanded at 100% capacity',
      source: 'BMS telemetry',
    },
    {
      label: 'Sub-meter draw',
      value: 'Chiller real power 92 kW vs baseline 30 kW',
      source: 'MTR-HVAC-01',
    },
  ],
  hypotheses: [
    {
      cause: 'Thermostat override active',
      confidence: 0.6,
      rationale: 'Override active flag set on zone thermostat.',
      suggestedCheck: 'Check thermostat timer guard.',
    },
  ],
  seriesPoints: [
    {
      timestamp: ONE_HOUR_AGO,
      actualKwh: 92,
      expectedKwh: 30,
      occupancy: 0.05,
      breakdown: { hvacKwh: 60, lightingKwh: 10, equipmentKwh: 15, otherKwh: 7 },
    },
    {
      timestamp: NOW_ISO,
      actualKwh: 90,
      expectedKwh: 30,
      occupancy: 0.04,
      breakdown: { hvacKwh: 58, lightingKwh: 10, equipmentKwh: 15, otherKwh: 7 },
    },
  ],
}

test('Complete consistent data yields High confidence (>= 80)', () => {
  const result = computeSustainabilityConfidenceScore(COMPLETE_CONSISTENT_INPUT)

  assert.equal(result.label, 'High')
  assert.ok(result.score !== null && result.score >= 80, `Expected score >= 80, got ${result.score}`)
  assert.equal(result.componentScores.completeness, 100)
  assert.equal(result.componentScores.freshness, 100)
  assert.ok(result.componentScores.consistency >= 85)
  assert.equal(result.missingFields.length, 0)
  assert.ok(result.evidenceUsed.length >= 2)
  assert.ok(result.causalityNotice.includes('hypotheses, not proven physical causes'))
})

test('Missing occupancy reduces completeness and is never interpreted as zero', () => {
  const inputMissingOccupancy: AnomalyScoreInput = {
    ...COMPLETE_CONSISTENT_INPUT,
    seriesPoints: [
      {
        timestamp: ONE_HOUR_AGO,
        actualKwh: 92,
        expectedKwh: 30,
        occupancy: undefined as unknown as number, // missing occupancy
        breakdown: { hvacKwh: 60, lightingKwh: 10, equipmentKwh: 15, otherKwh: 7 },
      },
    ],
    evidence: [
      {
        label: 'HVAC draw',
        value: 'Chiller load 92 kW',
        source: 'MTR-HVAC-01',
      },
    ],
  }

  const missingSet = new Set<string>()
  const reasons: string[] = []
  const completeness = calculateCompleteness(inputMissingOccupancy, missingSet, reasons)

  // Completeness should be penalized (-35 points for missing occupancy)
  assert.ok(completeness <= 75, `Expected completeness <= 75, got ${completeness}`)
  assert.ok(missingSet.has('occupancy'), 'missingFields must contain occupancy')
  assert.ok(
    reasons.some((r) => r.includes('cannot be interpreted as zero') || r.includes('cannot be assumed to be zero')),
    'Must explain missing occupancy cannot be interpreted as zero',
  )

  const overall = computeSustainabilityConfidenceScore(inputMissingOccupancy)
  assert.ok(overall.missingFields.includes('occupancy'))
})

test('Stale data results in reduced freshness score', () => {
  const staleInput: AnomalyScoreInput = {
    ...COMPLETE_CONSISTENT_INPUT,
    startTimestamp: '2026-10-10T00:00:00Z',
    endTimestamp: FIVE_DAYS_AGO, // 5 days old relative to reference
    referenceTimestamp: NOW_ISO,
  }

  const missingSet = new Set<string>()
  const reasons: string[] = []
  const limitations: string[] = []
  const freshness = calculateFreshness(staleInput, missingSet, reasons, limitations)

  // 5 days old (120 hours) should fall into the stale data tier (30 or lower)
  assert.ok(freshness <= 35, `Expected freshness <= 35 for 5-day old data, got ${freshness}`)
  assert.ok(reasons.some((r) => r.includes('stale') || r.includes('days old')))

  const overall = computeSustainabilityConfidenceScore(staleInput)
  assert.ok(overall.componentScores.freshness <= 35)
  // Overall score must be affected by stale freshness
  assert.ok(overall.score !== null && overall.score < 85)
})

test('Missing timestamps result in 0 freshness and unknown freshness is not treated as fresh', () => {
  const missingTimestampInput: AnomalyScoreInput = {
    ...COMPLETE_CONSISTENT_INPUT,
    startTimestamp: null,
    endTimestamp: null,
    seriesPoints: [],
  }

  const missingSet = new Set<string>()
  const reasons: string[] = []
  const limitations: string[] = []
  const freshness = calculateFreshness(missingTimestampInput, missingSet, reasons, limitations)

  assert.equal(freshness, 0, 'Unknown freshness must score 0, not silently treated as fresh')
  assert.ok(missingSet.has('timestamp'))
  assert.ok(
    reasons.some((r) => r.includes('not assumed fresh') || r.includes('Missing timestamp')),
  )
})

test('Conflicting evidence penalizes consistency score', () => {
  const conflictingInput: AnomalyScoreInput = {
    ...COMPLETE_CONSISTENT_INPUT,
    title: 'High occupancy weekend event load overrun',
    evidence: [
      {
        label: 'Wi-Fi AP telemetry',
        value: '0 occupants logged across Zone 101',
        source: 'Campus Wi-Fi controller',
      },
      {
        label: 'Sub-meter reading',
        value: '0.0 kW normal draw below baseline',
        source: 'MTR-HVAC-01',
      },
    ],
  }

  const reasons: string[] = []
  const limitations: string[] = []
  const consistency = calculateConsistency(conflictingInput, reasons, limitations)

  // Consistency should be heavily penalized due to contradictory evidence
  assert.ok(consistency < 60, `Expected consistency < 60, got ${consistency}`)
  assert.ok(
    reasons.some((r) => r.includes('Conflicting evidence')),
    'Reasons must identify conflicting evidence',
  )
})

test('Missing evidence is NOT supporting evidence', () => {
  const noEvidenceInput: AnomalyScoreInput = {
    ...COMPLETE_CONSISTENT_INPUT,
    evidence: [],
  }

  const reasons: string[] = []
  const limitations: string[] = []
  const consistency = calculateConsistency(noEvidenceInput, reasons, limitations)

  assert.ok(
    reasons.some((r) => r.includes('missing evidence is not supporting evidence')),
    'Must explicitly state missing evidence is not supporting evidence',
  )
  assert.ok(consistency <= 65, `Expected consistency without evidence <= 65, got ${consistency}`)
})

test('Insufficient data produces Unrated label and null score', () => {
  const insufficientInput: AnomalyScoreInput = {
    startTimestamp: null,
    endTimestamp: null,
    excessKwh: null,
    meanDeviationKwh: null,
    peakDeviationKwh: null,
    evidence: null,
    seriesPoints: null,
  }

  const result = computeSustainabilityConfidenceScore(insufficientInput)

  assert.equal(result.label, 'Unrated')
  assert.equal(result.score, null)
  assert.ok(result.limitations.some((l) => l.includes('insufficient')))
})
