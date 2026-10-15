export interface EnergyBreakdown {
  hvacKwh: number
  lightingKwh: number
  equipmentKwh: number
  otherKwh: number
}

export interface EnergyPoint {
  /** ISO 8601, UTC, hourly resolution */
  timestamp: string
  /** Modelled expected (baseline) consumption for the hour */
  expectedKwh: number
  /** Observed consumption for the hour */
  actualKwh: number
  /** 0..1 share of design occupancy */
  occupancy: number
  /** Component split of the expected (baseline) load */
  breakdown: EnergyBreakdown
}

export type AnomalySeverity = 'low' | 'medium' | 'high'

export interface EvidenceItem {
  label: string
  value: string
  source: string
}

export interface Hypothesis {
  cause: string
  /** 0..1 relative confidence */
  confidence: number
  rationale: string
  suggestedCheck: string
}

export interface Anomaly {
  id: string
  title: string
  /** ISO start of the anomalous window */
  startTimestamp: string
  /** ISO end (last anomalous hour) of the window */
  endTimestamp: string
  severity: AnomalySeverity
  peakDeviationKwh: number
  meanDeviationKwh: number
  meanDeviationPct: number
  excessKwh: number
  evidence: EvidenceItem[]
  hypotheses: Hypothesis[]
}

export interface HvacMeasure {
  enabled: boolean
  /** Degrees C of setback applied during the window */
  setbackC: number
  /** Window start hour (0-23, UTC); may wrap past midnight */
  startHour: number
  /** Window end hour (0-23, exclusive) */
  endHour: number
}

export interface LightingMeasure {
  enabled: boolean
  /** Percent reduction of lighting load (0-100) */
  reductionPct: number
}

export interface EquipmentMeasure {
  enabled: boolean
  /** Percent of idle equipment load that is switched off (0-100) */
  shutdownPct: number
  startHour: number
  endHour: number
}

export interface SimulationConfig {
  hvac: HvacMeasure
  lighting: LightingMeasure
  equipment: EquipmentMeasure
}

export interface SimulationAssumptions {
  /** Currency units per kWh */
  tariffPerKwh: number
  /** kg CO2e per kWh */
  emissionFactorKgPerKwh: number
}

export interface SimulationPoint {
  timestamp: string
  baselineKwh: number
  predictedKwh: number
}

export interface MeasureSavings {
  hvacKwh: number
  lightingKwh: number
  equipmentKwh: number
}

export interface SimulationTotals {
  baselineKwh: number
  predictedKwh: number
  savingsKwh: number
  savingsPct: number
  savingsLowKwh: number
  savingsHighKwh: number
  costSavings: number
  co2SavedKg: number
}

export interface SimulationResult {
  config: SimulationConfig
  points: SimulationPoint[]
  byMeasure: MeasureSavings
  totals: SimulationTotals
}

/** A previously implemented intervention with measured outcome (demo data). */
export interface VerificationRecord {
  id: string
  label: string
  period: string
  config: SimulationConfig
  observedSavingsPct: number
}

export interface DatasetMeta {
  isSynthetic: boolean
  datasetLabel: string
  siteName: string
  timezone: 'UTC'
  periodStart: string
  periodEnd: string
  assumptions: SimulationAssumptions
}

export interface EnergyDataset {
  meta: DatasetMeta
  series: EnergyPoint[]
  anomalies: Anomaly[]
  verification: VerificationRecord[]
}

export type DemoScenario = 'normal' | 'empty' | 'error' | 'slow'
