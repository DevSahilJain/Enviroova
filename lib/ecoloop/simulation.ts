import type {
  EnergyPoint,
  SimulationAssumptions,
  SimulationConfig,
  SimulationResult,
} from './types'

/**
 * Shared what-if simulation module. Pure functions only: no React, no I/O.
 *
 * Model summary (screening-level, not an engineering-grade building model):
 * - HVAC: each degree C of setback removes HVAC_SAVING_PER_C of HVAC load inside
 *   the window, capped at HVAC_MAX_FRACTION. The first hour after the window
 *   pays back HVAC_REBOUND_FACTOR of the hourly saving (recovery load).
 * - Lighting: reduction applies to lighting load, weighted toward low-occupancy
 *   hours where dimming is least noticeable.
 * - Equipment: only the idle (standby) share of equipment load is switched off,
 *   inside the window and scaled by how empty the building is.
 */

export const HVAC_SAVING_PER_C = 0.12
export const HVAC_MAX_FRACTION = 0.7
export const HVAC_REBOUND_FACTOR = 0.5
export const EQUIPMENT_IDLE_SHARE = 0.35

/** Relative 1-sigma uncertainty per measure, combined in quadrature. */
export const MEASURE_UNCERTAINTY = {
  hvac: 0.2,
  lighting: 0.1,
  equipment: 0.15,
} as const

export const DEFAULT_ASSUMPTIONS: SimulationAssumptions = {
  tariffPerKwh: 0.12,
  emissionFactorKgPerKwh: 0.38,
}

export const DEFAULT_CONFIG: SimulationConfig = {
  hvac: { enabled: true, setbackC: 2, startHour: 20, endHour: 6 },
  lighting: { enabled: true, reductionPct: 20 },
  equipment: { enabled: true, shutdownPct: 60, startHour: 20, endHour: 6 },
}

export const DISABLED_CONFIG: SimulationConfig = {
  hvac: { ...DEFAULT_CONFIG.hvac, enabled: false },
  lighting: { ...DEFAULT_CONFIG.lighting, enabled: false },
  equipment: { ...DEFAULT_CONFIG.equipment, enabled: false },
}

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min

const hour = (value: number) => Math.round(clamp(value, 0, 23))

/** Clamp all user inputs into their valid ranges. */
export function normalizeConfig(config: SimulationConfig): SimulationConfig {
  return {
    hvac: {
      enabled: config.hvac.enabled,
      setbackC: clamp(config.hvac.setbackC, 0, 4),
      startHour: hour(config.hvac.startHour),
      endHour: hour(config.hvac.endHour),
    },
    lighting: {
      enabled: config.lighting.enabled,
      reductionPct: clamp(config.lighting.reductionPct, 0, 100),
    },
    equipment: {
      enabled: config.equipment.enabled,
      shutdownPct: clamp(config.equipment.shutdownPct, 0, 100),
      startHour: hour(config.equipment.startHour),
      endHour: hour(config.equipment.endHour),
    },
  }
}

/** True when `h` falls in [start, end), handling windows that wrap midnight. */
export function isHourInWindow(h: number, start: number, end: number) {
  if (start === end) return false
  return start < end ? h >= start && h < end : h >= start || h < end
}

export function configsEqual(a: SimulationConfig, b: SimulationConfig) {
  const x = normalizeConfig(a)
  const y = normalizeConfig(b)
  return JSON.stringify(x) === JSON.stringify(y)
}

export function simulate(
  series: EnergyPoint[],
  rawConfig: SimulationConfig,
  assumptions: SimulationAssumptions = DEFAULT_ASSUMPTIONS,
): SimulationResult {
  const config = normalizeConfig(rawConfig)
  const { hvac, lighting, equipment } = config

  const hvacRate = hvac.enabled
    ? Math.min(HVAC_MAX_FRACTION, hvac.setbackC * HVAC_SAVING_PER_C)
    : 0

  let hvacKwh = 0
  let lightingKwh = 0
  let equipmentKwh = 0
  let baselineKwh = 0
  let predictedKwh = 0

  const points = series.map((point) => {
    const h = new Date(point.timestamp).getUTCHours()
    const { breakdown, occupancy } = point

    let hvacSaving = 0
    if (hvacRate > 0) {
      if (isHourInWindow(h, hvac.startHour, hvac.endHour)) {
        hvacSaving = breakdown.hvacKwh * hvacRate
      } else if (h === hvac.endHour && hvac.startHour !== hvac.endHour) {
        hvacSaving = -breakdown.hvacKwh * hvacRate * HVAC_REBOUND_FACTOR
      }
    }

    const lightingSaving = lighting.enabled
      ? breakdown.lightingKwh *
        (lighting.reductionPct / 100) *
        (0.6 + 0.4 * (1 - occupancy))
      : 0

    const equipmentSaving =
      equipment.enabled &&
      isHourInWindow(h, equipment.startHour, equipment.endHour)
        ? breakdown.equipmentKwh *
          EQUIPMENT_IDLE_SHARE *
          (equipment.shutdownPct / 100) *
          (1 - occupancy)
        : 0

    hvacKwh += hvacSaving
    lightingKwh += lightingSaving
    equipmentKwh += equipmentSaving

    const saving = hvacSaving + lightingSaving + equipmentSaving
    baselineKwh += point.expectedKwh
    predictedKwh += point.expectedKwh - saving

    return {
      timestamp: point.timestamp,
      baselineKwh: point.expectedKwh,
      predictedKwh: point.expectedKwh - saving,
    }
  })

  const savingsKwh = hvacKwh + lightingKwh + equipmentKwh
  const spread = Math.sqrt(
    (hvacKwh * MEASURE_UNCERTAINTY.hvac) ** 2 +
      (lightingKwh * MEASURE_UNCERTAINTY.lighting) ** 2 +
      (equipmentKwh * MEASURE_UNCERTAINTY.equipment) ** 2,
  )

  return {
    config,
    points,
    byMeasure: { hvacKwh, lightingKwh, equipmentKwh },
    totals: {
      baselineKwh,
      predictedKwh,
      savingsKwh,
      savingsPct: baselineKwh > 0 ? (savingsKwh / baselineKwh) * 100 : 0,
      savingsLowKwh: Math.max(0, savingsKwh - spread),
      savingsHighKwh: savingsKwh + spread,
      costSavings: savingsKwh * assumptions.tariffPerKwh,
      co2SavedKg: savingsKwh * assumptions.emissionFactorKgPerKwh,
    },
  }
}
