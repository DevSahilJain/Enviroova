'use client'

import {
  AlertTriangle,
  ChevronDown,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { formatKwh, formatSigned, formatTimeRange } from '@/lib/ecoloop/format'
import { computeSustainabilityConfidenceScore } from '@/lib/ecoloop/confidence-score'
import type { Anomaly, AnomalySeverity, ConfidenceLabel } from '@/lib/ecoloop/types'
import { cn } from '@/lib/utils'
import { Panel } from './panel'
import { NoDataState } from './states'

const SEVERITY_STYLES: Record<AnomalySeverity, string> = {
  high: 'bg-chart-5/15 text-chart-5 border-chart-5/30',
  medium: 'bg-chart-4/20 text-foreground border-chart-4/50',
  low: 'bg-muted text-muted-foreground border-border',
}

const CONFIDENCE_STYLES: Record<ConfidenceLabel, string> = {
  High: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Moderate: 'bg-chart-4/20 text-chart-4 border-chart-4/40',
  Low: 'bg-chart-5/15 text-chart-5 border-chart-5/30',
  Unrated: 'bg-muted text-muted-foreground border-border',
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
            const confidence =
              a.confidenceScore ??
              computeSustainabilityConfidenceScore({
                id: a.id,
                title: a.title,
                startTimestamp: a.startTimestamp,
                endTimestamp: a.endTimestamp,
                peakDeviationKwh: a.peakDeviationKwh,
                meanDeviationKwh: a.meanDeviationKwh,
                meanDeviationPct: a.meanDeviationPct,
                excessKwh: a.excessKwh,
                evidence: a.evidence,
                hypotheses: a.hypotheses,
                isSimulated: true,
              })

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
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          CONFIDENCE_STYLES[confidence.label],
                        )}
                      >
                        {confidence.score !== null ? `${confidence.score}% ` : ''}
                        {confidence.label} Conf.
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
                    {/* Sustainability Confidence Score Details */}
                    <div className="space-y-2 rounded-md border border-border/80 bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <ShieldCheck
                            aria-hidden="true"
                            className="size-4 text-primary"
                          />
                          <span>Sustainability Confidence Score</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                              CONFIDENCE_STYLES[confidence.label],
                            )}
                          >
                            {confidence.score !== null
                              ? `${confidence.score}/100 · `
                              : ''}
                            {confidence.label}
                          </span>
                          {confidence.isSimulated && (
                            <span className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              Simulated Finding
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Component breakdown */}
                      <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                        <div className="rounded border border-border/60 bg-card p-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              Completeness (40%)
                            </span>
                            <span className="font-medium tabular-nums">
                              {confidence.componentScores.completeness}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${confidence.componentScores.completeness}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="rounded border border-border/60 bg-card p-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              Freshness (25%)
                            </span>
                            <span className="font-medium tabular-nums">
                              {confidence.componentScores.freshness}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${confidence.componentScores.freshness}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="rounded border border-border/60 bg-card p-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              Consistency (35%)
                            </span>
                            <span className="font-medium tabular-nums">
                              {confidence.componentScores.consistency}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${confidence.componentScores.consistency}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Anomaly Detection Confidence vs Root-Cause Hypotheses */}
                      <div className="flex flex-wrap items-center justify-between border-t border-border/50 pt-2 text-[11px]">
                        <span className="text-muted-foreground">
                          Anomaly Detection Confidence (Empirical Telemetry):
                        </span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {confidence.anomalyDetectionConfidence}%
                        </span>
                      </div>

                      {/* Factors affecting confidence */}
                      {confidence.reasonsForReducedConfidence.length > 0 && (
                        <div className="rounded border border-chart-4/30 bg-chart-4/10 p-2 text-[11px]">
                          <div className="flex items-center gap-1 font-medium text-chart-4">
                            <AlertTriangle className="size-3.5 shrink-0" />
                            <span>Factors Affecting Confidence:</span>
                          </div>
                          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                            {confidence.reasonsForReducedConfidence.map(
                              (r, i) => (
                                <li key={i}>{r}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                      {confidence.missingFields.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Missing telemetry fields:{' '}
                          </span>
                          {confidence.missingFields.join(', ')}
                        </p>
                      )}
                    </div>

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
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="font-semibold">
                          Proposed root-cause hypotheses
                        </h3>
                        <span className="text-[10px] text-muted-foreground">
                          Unverified Inferences
                        </span>
                      </div>
                      <p className="mb-2 text-[11px] text-muted-foreground italic">
                        {confidence.causalityNotice}
                      </p>
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
