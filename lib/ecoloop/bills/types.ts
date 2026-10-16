/**
 * Electricity-bill-driven baseline vs actual analysis.
 *
 * This module turns two user-supplied numbers — a baseline (expected) energy
 * figure and an actual (measured) energy figure for a building over a reporting
 * period — into a deviation analysis with anomaly flags, data-quality
 * confidence, and investigation suggestions.
 *
 * It is deliberately simple and honest:
 *   - It is a threshold-based screen, NOT machine learning. The administrator
 *     sets the threshold; the module only applies it and explains the result.
 *   - It never invents meter readings. Every value comes from user input.
 *   - High and low consumption are flagged SEPARATELY, because a reading far
 *     below baseline is just as worth investigating as one far above.
 */

/** Reporting periods supported by the bill-entry form. */
export type ReportingPeriod = 'daily' | 'weekly' | 'monthly'

/** Default anomaly threshold: flag when deviation exceeds +/- this percent. */
export const DEFAULT_ANOMALY_THRESHOLD_PCT = 15

/** Severity used for anomaly presentation. */
export type BillAnomalySeverity = 'info' | 'warning' | 'critical'

/**
 * A single flagged deviation between actual and baseline consumption.
 *
 * `type` is one of three mutually-exclusive states so high and low consumption
 * are distinguishable at a glance.
 */
export interface BillAnomaly {
  type: 'high_consumption' | 'low_consumption' | 'none'
  severity: BillAnomalySeverity
  flagged: boolean
  deviationKwh: number
  deviationPct: number
  thresholdPct: number
  label: string
  detail: string
  suggestions: string[]
}

/** User-supplied input for one bill/reading entry. */
export interface BillInput {
  buildingId: string
  buildingName: string
  period: ReportingPeriod
  periodStart: string
  periodEnd: string
  baselineKwh: number
  actualKwh: number
  /** 0..1 average occupancy for the period, when known. */
  occupancy?: number
  /** Baseline from a previous comparable period, when known. */
  historicalBaselineKwh?: number
  /** Actual from a previous comparable period, when known. */
  historicalActualKwh?: number
  /** Free-text context, e.g. "exam week", "holiday closure". */
  notes?: string
  /** Admin-configurable anomaly threshold (% deviation). */
  anomalyThresholdPct?: number
  /** Currency units per kWh, for cost context. */
  tariffPerKwh?: number
}

/** A persisted analysis record. */
export interface BillAnalysis {
  id: string
  buildingId: string
  buildingName: string
  period: ReportingPeriod
  periodStart: string
  periodEnd: string
  baselineKwh: number
  actualKwh: number
  deviationKwh: number
  deviationPct: number
  occupancy?: number
  anomaly: BillAnomaly
  /** 0-100 data-quality confidence for this entry. */
  confidence: number
  confidenceReasons: string[]
  isSimulated: boolean
  assumptions: string[]
  createdAt: string
}

/** Result of attempting to persist an analysis. */
export interface SaveBillResult {
  saved: boolean
  id?: string
  mode: 'backend' | 'demo'
  message?: string
}