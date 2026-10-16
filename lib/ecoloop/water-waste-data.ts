/**
 * Simulated water and waste management data for DSU campus demo.
 *
 * These values are synthetic demonstration data — not live meter readings.
 * They illustrate the metrics a water/waste module would track once real
 * telemetry is available. Marked clearly as simulated to avoid presenting
 * invented measurements as observed facts.
 */

export interface WaterUsage {
  date: string
  baselineLitres: number
  actualLitres: number
}

export interface WasteGeneration {
  date: string
  baselineKg: number
  actualKg: number
}

export interface WaterWasteDataset {
  water: WaterUsage[]
  waste: WasteGeneration[]
  isSimulated: boolean
}

const DAYS = 7
const START_DATE = new Date(2026, 9, 8) // 8 Oct 2026

function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function buildWaterWasteDataset(): WaterWasteDataset {
  const water: WaterUsage[] = []
  const waste: WasteGeneration[] = []

  // Base daily values (litres for water, kg for waste)
  const baseWaterBaseline = 2000
  const baseWasteBaseline = 60

  for (let i = 0; i < DAYS; i++) {
    const date = new Date(START_DATE.getTime() + i * 86_400_000)
    const dateKey = formatDateKey(date)
    const dayOfWeek = date.getDay() // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Water: higher on weekdays, some leakage-driven excess
    const waterBaseline = baseWaterBaseline * (isWeekend ? 0.4 : 1.0)
    const waterActual = waterBaseline * (1.0 + 0.15 + (isWeekend ? 0.05 : 0.0))
    water.push({
      date: dateKey,
      baselineLitres: Math.round(waterBaseline),
      actualLitres: Math.round(waterActual),
    })

    // Waste: higher on weekdays, some contamination-driven excess
    const wasteBaseline = baseWasteBaseline * (isWeekend ? 0.3 : 1.0)
    const wasteActual = wasteBaseline * (1.0 + 0.25 + (isWeekend ? 0.1 : 0.0))
    waste.push({
      date: dateKey,
      baselineKg: Math.round(wasteBaseline * 10) / 10,
      actualKg: Math.round(wasteActual * 10) / 10,
    })
  }

  return {
    water,
    waste,
    isSimulated: true,
  }
}

let cached: WaterWasteDataset | null = null

export function getWaterWasteDataset(): WaterWasteDataset {
  if (cached) return cached
  cached = buildWaterWasteDataset()
  return cached
}
