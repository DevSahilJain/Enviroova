'use client'

import { useMemo, useState } from 'react'
import {
  Building2,
  Clock,
  DollarSign,
  Lightbulb,
  Plug,
  ShieldAlert,
  Thermometer,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from './panel'
import { cn } from '@/lib/utils'
import {
  BUDGET_OPTIONS,
  DEFAULT_BUDGET,
  formatCurrency,
  formatKwh,
  INTERVENTIONS,
  optimizeInterventions,
  type Intervention,
} from '@/lib/ecoloop/optimizer'

const AMBER = '#FFBF00'

const CATEGORY_ICON: Record<Intervention['category'], React.ReactNode> = {
  HVAC: <Thermometer className="size-4" aria-hidden="true" />,
  Lighting: <Lightbulb className="size-4" aria-hidden="true" />,
  Equipment: <Plug className="size-4" aria-hidden="true" />,
  Envelope: <Building2 className="size-4" aria-hidden="true" />,
}

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

function MetricCard({
  label,
  value,
  sub,
  accent = false,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 flex flex-col gap-1',
        accent ? 'border-amber-500/50 bg-amber-500/5' : 'border-border bg-muted/40',
      )}
    >
      <span className={cn('text-[11px] font-medium uppercase tracking-wide', accent ? 'text-amber-700' : 'text-muted-foreground')}>
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {sub ? <span className="text-[11px] text-muted-foreground">{sub}</span> : null}
    </div>
  )
}

function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const labels = ['—', 'Easy', 'Easy', 'Moderate', 'Hard', 'Expert']
  const label = labels[difficulty] ?? '—'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
        'border-transparent bg-muted text-muted-foreground',
      )}
    >
      <span className="size-1.5 rounded-full bg-primary"></span>
      {label}
    </span>
  )
}

function InterventionRow({
  item,
  rank,
}: {
  item: Intervention
  rank: number
}) {
  return (
    <div className="group flex items-start gap-3 rounded-lg border p-3 bg-background hover:bg-muted/30 transition-colors">
      <span className="mt-0.5 shrink-0 text-lg font-bold text-muted-foreground">{rank}</span>
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-md bg-primary/10 p-1.5 text-primary shrink-0',
            )}
          >
            {CATEGORY_ICON[item.category]}
          </span>
          <h4 className="font-semibold truncate">{item.name}</h4>
          <DifficultyBadge difficulty={item.difficulty} />
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {item.description}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Estimated savings
            </span>
            <span className="font-semibold tabular-nums">{formatKwh(item.estimatedSavingsKwh)}</span>
            <span className="text-[10px] text-muted-foreground">
              / year
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Implementation cost
            </span>
            <span className="font-semibold tabular-nums">{formatCurrency(item.cost)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Payback period
            </span>
            <span className="font-semibold tabular-nums">
              {item.paybackYears.toFixed(1)} yrs
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Building
            </span>
            <span className="text-sm tabular-nums">
              {item.buildingId ?? 'Campus-wide'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function OptimizerPanel() {
  const [budget, setBudget] = useState(DEFAULT_BUDGET)
  const result = useMemo(() => optimizeInterventions(budget), [budget])

  const { selected, totalSavingsKwh, totalCost, remainingBudget, paybackYears } =
    result

  const affordableChipOptions = BUDGET_OPTIONS.filter((b) => b >= budget)
  const nextBudgetChip = affordableChipOptions[0]

  const setBudgetSafe = (value: number | string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setBudget(0)
      return
    }
    setBudget(Math.min(parsed, BUDGET_OPTIONS[BUDGET_OPTIONS.length - 1]))
  }

  const isInvalid = !Number.isFinite(budget) || budget < 0
  const isEmpty = selected.length === 0 && budget >= 0

  return (
    <Panel
      title="Sustainability Action Optimizer"
      description="Rank intervention recommendations by estimated savings, cost, payback, and difficulty within a chosen budget. All figures are simulated estimates, not measured campus results."
      className="min-w-0"
    >
      <div className="space-y-5">
        {/* Budget controls */}
        <section className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <label htmlFor="optimizer-budget" className="font-medium">
                Investment budget
              </label>
            </div>
            <div className="flex-1">
              <div className="flex items-end gap-1 text-xs text-muted-foreground">
                <span>$0</span>
                <span className="mx-2">—</span>
                <span>{formatCurrency(100000)}</span>
              </div>
              <input
                id="optimizer-budget"
                type="range"
                min={0}
                max={100000}
                step={1000}
                value={budget}
                onChange={(e) => setBudgetSafe(e.target.value)}
                className="h-5 w-full cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-xs font-medium tabular-nums text-primary">
                <span>$0</span>
                <span>{formatCurrency(budget)}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBudget(b)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-xs',
                  budget === b
                    ? 'border-amber-500 bg-amber-500/20 text-amber-700'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {formatCurrency(b)}
              </button>
            ))}
            {nextBudgetChip && nextBudgetChip !== budget && (
              <button
                type="button"
                onClick={() => setBudget(nextBudgetChip)}
                className="rounded-md border border-dashed border-amber-500/50 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-500/10"
              >
                Increase to {formatCurrency(nextBudgetChip)}
              </button>
            )}
          </div>
        </section>

        {/* Estimate disclaimer */}
        <section
          className={cn(
            'rounded-lg border border-amber-500/50 bg-amber-500/10 p-4',
            isInvalid ? 'hidden' : '',
          )}
        >
          <div className="flex items-start gap-2">
            <ShieldAlert
              className="size-4 shrink-0 text-amber-700 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium text-amber-800">
                Simulated estimates only
              </p>
              <p className="text-xs text-amber-700">
                Savings, cost, and payback figures are model-based estimates
                from the Enviroova sustainability engine, not live campus meter
                readings. Use them to prioritize interventions, not as
                guaranteed outcomes.
              </p>
            </div>
          </div>
        </section>

        {/* Invalid budget state */}
        {isInvalid ? (
          <section className="rounded-lg border border-dashed bg-card/30 p-6 text-center text-sm text-muted-foreground">
            <p>
              Enter a valid budget (0 to {formatCurrency(100000)}) to see
              recommendations.
            </p>
          </section>
        ) : null}

        {/* Empty state */}
        {isEmpty && !isInvalid ? (
          <section className="rounded-lg border border-dashed bg-card/30 p-6 text-center text-sm text-muted-foreground">
            <p>
              No interventions fit within {formatCurrency(budget)}. Increase
              the budget to see recommendations.
            </p>
          </section>
        ) : null}

        {/* Recommendations */}
        {!isInvalid && !isEmpty && (
          <>
            <section className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <MetricCard
                  label="Estimated annual savings"
                  value={formatKwh(totalSavingsKwh)}
                  accent
                  sub="per year"
                />
                <MetricCard
                  label="Total investment"
                  value={formatCurrency(totalCost)}
                />
                <MetricCard
                  label="Remaining budget"
                  value={formatCurrency(remainingBudget)}
                />
                <MetricCard
                  label="Combined payback"
                  value={`${paybackYears.toFixed(1)} yrs`}
                  sub="simple payback"
                />
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recommended interventions
              </h3>
              <div className="space-y-2">
                {selected.map((item, i) => (
                  <InterventionRow key={item.id} item={item} rank={i + 1} />
                ))}
              </div>
            </section>

            {/* Explanation */}
            <section className="rounded-lg border bg-muted/40 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Why these recommendations
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Recommendations are ranked by <b>estimated savings per dollar
                of cost</b> (a greedy knapsack). The optimizer selects the
                highest-value interventions that fit within your budget, in
                order, until the next item would exceed it. Because every
                intervention has a fixed cost, not every budget produces a
                perfect fit — leftover budget is shown as remaining.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded bg-blue-50 p-3 border border-blue-100">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-blue-700">
                    Raising the budget
                  </p>
                  <p className="text-sm text-blue-900 mt-1 leading-relaxed">
                    Lets more (and higher-cost) interventions fit, increasing
                    total estimated savings. Combined payback may rise because
                    larger projects take longer to recover their cost.
                  </p>
                </div>
                <div className="rounded bg-amber-50 p-3 border border-amber-100">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                    Lowering the budget
                  </p>
                  <p className="text-sm text-amber-900 mt-1 leading-relaxed">
                    Filters to the cheapest, fastest-payback items first. You
                    may see fewer recommendations and less total savings, but
                    the ones shown recover their cost quickly.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Adjust the slider above to explore how different investment
                levels change the recommended set. All calculations are
                <span style={{ color: AMBER, fontWeight: '600' }}>
                  simulated estimates
                </span>
                — verify with a site audit before committing capital.
              </p>
            </section>
          </>
        )}
      </div>
    </Panel>
  )
}
