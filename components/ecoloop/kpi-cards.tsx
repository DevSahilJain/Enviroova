import { Activity, Gauge, Leaf, TriangleAlert } from 'lucide-react'
import {
  formatCurrency,
  formatKwh,
  formatNumber,
  formatSigned,
} from '@/lib/ecoloop/format'
import type { Anomaly, EnergyPoint, SimulationResult } from '@/lib/ecoloop/types'

interface KpiCardsProps {
  series: EnergyPoint[]
  anomalies: Anomaly[]
  simulation: SimulationResult
}

interface Kpi {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
}

export function KpiCards({ series, anomalies, simulation }: KpiCardsProps) {
  const baseline = series.reduce((s, p) => s + p.expectedKwh, 0)
  const actual = series.reduce((s, p) => s + p.actualKwh, 0)
  const deltaPct = baseline > 0 ? ((actual - baseline) / baseline) * 100 : 0
  const excess = anomalies.reduce((s, a) => s + a.excessKwh, 0)
  const { totals } = simulation

  const kpis: Kpi[] = [
    {
      label: 'Baseline energy',
      value: formatKwh(baseline),
      detail: 'Expected usage, 7 days',
      icon: <Gauge className="size-4" aria-hidden="true" />,
    },
    {
      label: 'Actual energy',
      value: formatKwh(actual),
      detail: `${formatSigned(deltaPct, '%')} vs baseline`,
      icon: <Activity className="size-4" aria-hidden="true" />,
    },
    {
      label: 'Anomalies',
      value: formatNumber(anomalies.length),
      detail:
        anomalies.length > 0
          ? `${formatNumber(excess)} kWh excess in flagged windows`
          : 'No flagged windows',
      icon: <TriangleAlert className="size-4" aria-hidden="true" />,
    },
    {
      label: 'Estimated savings',
      value: formatKwh(totals.savingsKwh),
      detail: `${totals.savingsPct.toFixed(1)}% / ${formatCurrency(totals.costSavings)} (scenario estimate)`,
      icon: <Leaf className="size-4" aria-hidden="true" />,
    },
  ]

  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border bg-card p-4 shadow-xs sm:p-5"
        >
          <dt className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            {kpi.label}
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              {kpi.icon}
            </span>
          </dt>
          <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {kpi.value}
          </dd>
          <dd className="mt-1 text-xs text-muted-foreground">{kpi.detail}</dd>
        </div>
      ))}
    </dl>
  )
}
