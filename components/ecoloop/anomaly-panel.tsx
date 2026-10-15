'use client'

import { ChevronDown, SearchCheck } from 'lucide-react'
import { formatKwh, formatSigned, formatTimeRange } from '@/lib/ecoloop/format'
import type { Anomaly, AnomalySeverity } from '@/lib/ecoloop/types'
import { cn } from '@/lib/utils'
import { Panel } from './panel'
import { NoDataState } from './states'

const SEVERITY_STYLES: Record<AnomalySeverity, string> = {
  high: 'bg-chart-5/15 text-chart-5 border-chart-5/30',
  medium: 'bg-chart-4/20 text-foreground border-chart-4/50',
  low: 'bg-muted text-muted-foreground border-border',
}

interface AnomalyPanelProps {
  anomalies: Anomaly[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function AnomalyPanel({
  anomalies,
  selectedId,
  onSelect,
}: AnomalyPanelProps) {
  return (
    <Panel
      title="Sustainability Detective"
      description="Flagged deviations with evidence and ranked root-cause hypotheses"
      className="xl:max-h-[34rem]"
    >
      {anomalies.length === 0 ? (
        <NoDataState
          title="No anomalies detected"
          description="Actual usage stayed within the expected range for this period."
        />
      ) : (
        <ul className="-m-1 space-y-3 overflow-y-auto p-1 xl:max-h-[27rem]">
          {anomalies.map((a) => {
            const open = a.id === selectedId
            const panelId = `${a.id}-details`
            return (
              <li key={a.id} className="rounded-lg border">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => onSelect(open ? null : a.id)}
                  className="flex w-full items-start gap-3 rounded-lg p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
                          SEVERITY_STYLES[a.severity],
                        )}
                      >
                        {a.severity}
                      </span>
                      <span className="text-sm font-medium">{a.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={a.startTimestamp}>
                        {formatTimeRange(a.startTimestamp, a.endTimestamp)}
                      </time>
                    </p>
                    <p className="text-xs tabular-nums">
                      <span className="font-medium">
                        {formatSigned(a.meanDeviationPct, '%')}
                      </span>{' '}
                      mean deviation, peak {formatSigned(a.peakDeviationKwh)}{' '}
                      kWh/h, {formatKwh(a.excessKwh)} excess
                    </p>
                  </div>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'mt-1 size-4 shrink-0 text-muted-foreground transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                </button>

                {open ? (
                  <div
                    id={panelId}
                    className="space-y-4 border-t px-3 py-3 text-xs"
                  >
                    <div>
                      <h3 className="mb-2 flex items-center gap-1.5 font-semibold">
                        <SearchCheck
                          aria-hidden="true"
                          className="size-3.5 text-primary"
                        />
                        Evidence
                      </h3>
                      <dl className="space-y-1.5">
                        {a.evidence.map((e) => (
                          <div
                            key={e.label}
                            className="grid grid-cols-[7.5rem_1fr] gap-2"
                          >
                            <dt className="text-muted-foreground">{e.label}</dt>
                            <dd>
                              {e.value}
                              <span className="block text-[11px] text-muted-foreground">
                                {e.source}
                              </span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div>
                      <h3 className="mb-2 font-semibold">
                        Possible root causes
                      </h3>
                      <ol className="space-y-3">
                        {a.hypotheses.map((h) => {
                          const pct = Math.round(h.confidence * 100)
                          return (
                            <li key={h.cause} className="space-y-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium">{h.cause}</span>
                                <span className="tabular-nums text-muted-foreground">
                                  {pct}%
                                </span>
                              </div>
                              <div
                                role="meter"
                                aria-label={`Relative confidence for ${h.cause}`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={pct}
                                className="h-1.5 overflow-hidden rounded-full bg-muted"
                              >
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-muted-foreground">
                                {h.rationale}
                              </p>
                              <p>
                                <span className="font-medium">Check: </span>
                                {h.suggestedCheck}
                              </p>
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
