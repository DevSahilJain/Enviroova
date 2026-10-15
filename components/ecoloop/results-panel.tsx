'use client'

import { useMemo } from 'react'
import { CircleCheck, Hourglass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  formatCurrency,
  formatKwh,
  formatNumber,
  formatSigned,
} from '@/lib/ecoloop/format'
import { configsEqual, simulate } from '@/lib/ecoloop/simulation'
import type {
  EnergyPoint,
  SimulationAssumptions,
  SimulationConfig,
  SimulationResult,
  VerificationRecord,
} from '@/lib/ecoloop/types'
import { Panel } from './panel'

interface ResultsPanelProps {
  series: EnergyPoint[]
  simulation: SimulationResult
  verification: VerificationRecord[]
  assumptions: SimulationAssumptions
  onLoadConfig: (config: SimulationConfig) => void
}

function UsageBar({
  label,
  value,
  max,
  tone,
}: {
  label: string
  value: number
  max: number
  tone: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="grid grid-cols-[6.5rem_1fr_5.5rem] items-center gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div
        role="img"
        aria-label={`${label}: ${formatKwh(value)}`}
        className="h-3 overflow-hidden rounded-sm bg-muted"
      >
        <div
          className={`h-full rounded-sm ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-right font-medium tabular-nums">
        {formatKwh(value)}
      </span>
    </div>
  )
}

export function ResultsPanel({
  series,
  simulation,
  verification,
  assumptions,
  onLoadConfig,
}: ResultsPanelProps) {
  const { totals, byMeasure } = simulation

  const matched = verification.find((v) =>
    configsEqual(v.config, simulation.config),
  )
  const observedSavingsKwh = matched
    ? (totals.baselineKwh * matched.observedSavingsPct) / 100
    : null
  const observedKwh =
    observedSavingsKwh === null ? null : totals.baselineKwh - observedSavingsKwh

  const pilotRows = useMemo(
    () =>
      verification.map((v) => {
        const predictedPct = simulate(series, v.config, assumptions).totals
          .savingsPct
        return { ...v, predictedPct, deltaPp: v.observedSavingsPct - predictedPct }
      }),
    [verification, series, assumptions],
  )

  const measures = [
    { label: 'HVAC setback', value: byMeasure.hvacKwh },
    { label: 'Lighting', value: byMeasure.lightingKwh },
    { label: 'Equipment shutdown', value: byMeasure.equipmentKwh },
  ]
  const maxMeasure = Math.max(...measures.map((m) => Math.abs(m.value)), 1)

  return (
    <Panel
      title="Predicted vs observed"
      description="Simulated outcome for the current settings, verified against measured pilots where available"
    >
      <div className="space-y-6">
        <div className="space-y-2" aria-live="polite">
          <UsageBar
            label="Baseline"
            value={totals.baselineKwh}
            max={totals.baselineKwh}
            tone="bg-muted-foreground/60"
          />
          <UsageBar
            label="Predicted"
            value={totals.predictedKwh}
            max={totals.baselineKwh}
            tone="bg-chart-2"
          />
          {observedKwh !== null ? (
            <UsageBar
              label="Observed"
              value={observedKwh}
              max={totals.baselineKwh}
              tone="bg-chart-1"
            />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm tabular-nums">
            <caption className="sr-only">
              Baseline, predicted and observed results for the current
              simulation
            </caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Metric
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Predicted
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Observed
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  Baseline usage
                </th>
                <td className="py-2 pr-3 text-right">
                  {formatKwh(totals.baselineKwh)}
                </td>
                <td className="py-2 text-right text-muted-foreground">
                  {formatKwh(totals.baselineKwh)}
                </td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  Resulting usage
                </th>
                <td className="py-2 pr-3 text-right">
                  {formatKwh(totals.predictedKwh)}
                </td>
                <td className="py-2 text-right">
                  {observedKwh !== null ? (
                    formatKwh(observedKwh)
                  ) : (
                    <span className="text-muted-foreground">Not available</span>
                  )}
                </td>
              </tr>
              <tr className="border-b">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  Savings
                </th>
                <td className="py-2 pr-3 text-right font-medium">
                  {formatKwh(totals.savingsKwh)}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {totals.savingsPct.toFixed(1)}% (range{' '}
                    {formatNumber(totals.savingsLowKwh)}-
                    {formatNumber(totals.savingsHighKwh)})
                  </span>
                </td>
                <td className="py-2 text-right font-medium">
                  {observedSavingsKwh !== null && matched ? (
                    <>
                      {formatKwh(observedSavingsKwh)}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {matched.observedSavingsPct.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <span className="font-normal text-muted-foreground">
                      Not available
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  Cost / CO2e avoided
                </th>
                <td className="py-2 pr-3 text-right">
                  {formatCurrency(totals.costSavings)} /{' '}
                  {formatNumber(totals.co2SavedKg)} kg
                </td>
                <td className="py-2 text-right text-muted-foreground">
                  Not available
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            {matched ? (
              <>
                <CircleCheck
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-primary"
                />
                Observed values come from the &ldquo;{matched.label}&rdquo;
                pilot ({matched.period}), expressed against this week&apos;s
                baseline.
              </>
            ) : (
              <>
                <Hourglass
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0"
                />
                No implemented pilot matches these settings, so there is
                nothing to verify yet.
              </>
            )}
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold">Predicted savings by measure</h3>
          <ul className="space-y-1.5">
            {measures.map((m) => (
              <li
                key={m.label}
                className="grid grid-cols-[8.5rem_1fr_5.5rem] items-center gap-3 text-xs"
              >
                <span className="text-muted-foreground">{m.label}</span>
                <div
                  aria-hidden="true"
                  className="h-2 overflow-hidden rounded-sm bg-muted"
                >
                  <div
                    className="h-full rounded-sm bg-primary"
                    style={{
                      width: `${Math.max(0, (m.value / maxMeasure) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-right tabular-nums">
                  {formatKwh(m.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold">
            Verification of past pilots (demo)
          </h3>
          <ul className="divide-y rounded-lg border">
            {pilotRows.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-muted-foreground">{p.period}</p>
                </div>
                <dl className="flex gap-4 tabular-nums">
                  <div>
                    <dt className="text-muted-foreground">Predicted</dt>
                    <dd className="font-medium">
                      {p.predictedPct.toFixed(1)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Observed</dt>
                    <dd className="font-medium">
                      {p.observedSavingsPct.toFixed(1)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Gap</dt>
                    <dd className="font-medium">{formatSigned(p.deltaPp, ' pp')}</dd>
                  </div>
                </dl>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLoadConfig(p.config)}
                >
                  Load settings
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  )
}
