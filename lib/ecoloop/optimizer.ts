export interface Intervention {
  id: string
  name: string
  category: 'HVAC' | 'Lighting' | 'Equipment' | 'Envelope'
  description: string
  /** Estimated annual energy savings, kWh */
  estimatedSavingsKwh: number
  /** Implementation cost, INR */
  cost: number
  /** Payback period, years */
  paybackYears: number
  /** Difficulty 1-5 (1 = easiest) */
  difficulty: 1 | 2 | 3 | 4 | 5
  /** Building id this applies to, or null for campus-wide */
  buildingId: string | null
}

export const INTERVENTIONS: Intervention[] = [
  {
    id: 'opt-lighting-led',
    name: 'LED retrofit — lighting circuits',
    category: 'Lighting',
    description: 'Replace fluorescent and halogen fixtures with LED across low-usage corridors and labs.',
    estimatedSavingsKwh: 18400,
    cost: 300000,
    paybackYears: 2.5,
    difficulty: 2,
    buildingId: null,
  },
  {
    id: 'opt-hvac-schedule',
    name: 'HVAC occupancy scheduling',
    category: 'HVAC',
    description: 'Program setback windows to match actual occupancy; no capital cost.',
    estimatedSavingsKwh: 22800,
    cost: 50000,
    paybackYears: 0.3,
    difficulty: 1,
    buildingId: null,
  },
  {
    id: 'opt-equip-shutdown',
    name: 'Idle equipment auto-shutdown',
    category: 'Equipment',
    description: 'Smart relays switch off lab and office plug loads outside occupied hours.',
    estimatedSavingsKwh: 12600,
    cost: 250000,
    paybackYears: 3.0,
    difficulty: 3,
    buildingId: null,
  },
  {
    id: 'opt-hvac-economizer',
    name: 'AHU economizer damper repair',
    category: 'HVAC',
    description: 'Fix stuck economizer dampers to use free cooling during mild periods.',
    estimatedSavingsKwh: 15200,
    cost: 150000,
    paybackYears: 1.5,
    difficulty: 3,
    buildingId: 'science-complex',
  },
  {
    id: 'opt-lighting-occ',
    name: 'Occupancy-based lighting control',
    category: 'Lighting',
    description: 'Add occupancy sensors to classrooms and meeting rooms.',
    estimatedSavingsKwh: 9400,
    cost: 200000,
    paybackYears: 3.3,
    difficulty: 2,
    buildingId: null,
  },
  {
    id: 'opt-bms-tune',
    name: 'BMS control optimization',
    category: 'HVAC',
    description: 'Retune setpoints and schedules across the central plant.',
    estimatedSavingsKwh: 19800,
    cost: 400000,
    paybackYears: 3.1,
    difficulty: 4,
    buildingId: null,
  },
  {
    id: 'opt-window-seal',
    name: 'Window sealing and weatherization',
    category: 'Envelope',
    description: 'Seal gaps around window frames and improve perimeter insulation.',
    estimatedSavingsKwh: 6200,
    cost: 120000,
    paybackYears: 3.0,
    difficulty: 2,
    buildingId: 'north-dorms',
  },
  {
    id: 'opt-vrf-upgrade',
    name: 'VRF HVAC replacement',
    category: 'HVAC',
    description: 'Replace aging split systems with variable-refrigerant-flow units.',
    estimatedSavingsKwh: 31000,
    cost: 1200000,
    paybackYears: 6.0,
    difficulty: 5,
    buildingId: 'sports-arena',
  },
]

export const BUDGET_OPTIONS = [500000, 1000000, 2000000, 3000000, 4000000]

export const DEFAULT_BUDGET = 2000000

export interface OptimizerResult {
  selected: Intervention[]
  totalSavingsKwh: number
  totalCost: number
  remainingBudget: number
  paybackYears: number
}

/** Tariff used to convert annual kWh savings into rupee savings. Default ₹6.50/kWh. */
export const OPTIMIZER_TARIFF = 6.5

/** Greedy knapsack by best savings-per-rupee, respecting budget. */
export function optimizeInterventions(
  budget: number,
  tariff: number = OPTIMIZER_TARIFF,
): OptimizerResult {
  const sorted = [...INTERVENTIONS].sort(
    (a, b) => b.estimatedSavingsKwh / b.cost - a.estimatedSavingsKwh / a.cost,
  )
  const selected: Intervention[] = []
  let totalSavingsKwh = 0
  let totalCost = 0
  for (const item of sorted) {
    if (totalCost + item.cost <= budget) {
      selected.push(item)
      totalSavingsKwh += item.estimatedSavingsKwh
      totalCost += item.cost
    }
  }
  const annualSavings = totalSavingsKwh * tariff
  return {
    selected,
    totalSavingsKwh,
    totalCost,
    remainingBudget: budget - totalCost,
    paybackYears: annualSavings > 0 ? totalCost / annualSavings : 0,
  }
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '₹—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}

export function formatKwh(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)} MWh`
  }
  return `${value.toFixed(0)} kWh`
}

export function difficultyLabel(d: Intervention['difficulty']): string {
  return ['—', 'Easy', 'Easy', 'Moderate', 'Hard', 'Expert'][d]
}
