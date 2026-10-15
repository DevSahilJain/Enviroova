import { FlaskConical } from 'lucide-react'
import type { DemoScenario } from '@/lib/ecoloop/types'

const SCENARIO_LABELS: Record<DemoScenario, string> = {
  normal: 'Normal',
  slow: 'Slow response (loading)',
  empty: 'No data (empty)',
  error: 'Service failure (error)',
}

interface DemoBannerProps {
  scenario: DemoScenario
  onScenarioChange: (scenario: DemoScenario) => void
}

export function DemoBanner({ scenario, onScenarioChange }: DemoBannerProps) {
  return (
    <div
      role="note"
      className="border-b border-chart-4/40 bg-chart-4/15 text-foreground"
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 text-xs sm:px-6">
        <p className="flex items-start gap-2">
          <FlaskConical
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0"
          />
          <span>
            <strong className="font-semibold">Synthetic demo data.</strong>{' '}
            Every value is generated for demonstration and does not represent
            actual DSU sensor readings.
          </span>
        </p>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Preview data state</span>
          <select
            value={scenario}
            onChange={(e) => onScenarioChange(e.target.value as DemoScenario)}
            className="h-7 rounded-md border bg-background px-2 text-xs focus-visible:outline-2 focus-visible:outline-ring"
          >
            {(Object.keys(SCENARIO_LABELS) as DemoScenario[]).map((key) => (
              <option key={key} value={key}>
                {SCENARIO_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
