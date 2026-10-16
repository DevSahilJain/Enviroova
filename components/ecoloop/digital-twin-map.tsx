'use client'

import { useMemo, useState } from 'react'
import {
  MapPin,
  Zap,
  AlertTriangle,
  Droplets,
  Trash2,
  Sun,
  Building,
} from 'lucide-react'
import {
  CAMPUS_BUILDINGS,
  type CampusBuilding,
  type CampusZone,
  statusTone,
  ZONE_CONFIG,
} from '@/lib/ecoloop/digital-twin'
import { Panel } from './panel'
import { formatKwh } from '@/lib/ecoloop/format'
import { cn } from '@/lib/utils'

/** Status -> tailwind color swatch used for pins, badges and the legend. */
const STATUS_COLORS: Record<
  CampusBuilding['status'],
  { bg: string; border: string; text: string; dot: string }
> = {
  'Critical Anomaly': {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/40',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  Elevated: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  Normal: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
}

interface CampusDigitalTwinMapProps {
  /** Which satellite image to display. Defaults to "main". */
  zone?: CampusZone
  /** Called when the user clicks a building pin. */
  onBuildingSelect?: (building: CampusBuilding) => void
  /** ID of the building currently highlighted by the parent. */
  selectedBuildingId?: string | null
  className?: string
}

/**
 * Lightweight "Digital Twin Lite": an interactive image map of the campus
 * with clickable building overlays pinned by normalized coordinates.
 *
 * No 3D engine, no external map tiles, no backend — just the two Google
 * Earth campus images served from public/images/. All figures are simulated
 * estimates, not live meter measurements.
 */
export function CampusDigitalTwinMap({
  zone = 'main',
  onBuildingSelect,
  selectedBuildingId = null,
  className,
}: CampusDigitalTwinMapProps) {
  const [activeZone, setActiveZone] = useState<CampusZone>(zone)
  // Internal selection state so a click immediately shows the detail card even
  // when the parent does not manage selection (the default case here).
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    selectedBuildingId,
  )
  const cfg = ZONE_CONFIG[activeZone]
  const buildings = CAMPUS_BUILDINGS.filter((b) => b.zone === activeZone)

  // The prop wins when provided; otherwise the component owns the selection.
  const selectedId = selectedBuildingId ?? internalSelectedId

  function selectBuilding(b: CampusBuilding) {
    setInternalSelectedId(b.id)
    onBuildingSelect?.(b)
  }

  const anomalyCount = buildings.filter(
    (b) => b.status === 'Critical Anomaly',
  ).length
  const elevatedCount = buildings.filter(
    (b) => b.status === 'Elevated',
  ).length
  return (
    <Panel
      title="Campus Digital Twin Lite"
      description="Interactive satellite overlay with clickable building pins. All figures are simulated estimates, not live meter measurements."
      className={className}
      actions={
        <div
          role="group"
          aria-label="Campus zone"
          className="flex items-center gap-1 rounded-md border p-0.5"
        >
          {(Object.keys(ZONE_CONFIG) as CampusZone[]).map((z) => (
            <button
              key={z}
              type="button"
              aria-pressed={activeZone === z}
              onClick={() => setActiveZone(z)}
              className={
                activeZone === z
                  ? 'rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground'
                  : 'rounded px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted'
              }
            >
              {ZONE_CONFIG[z].title}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sun className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">{cfg.subtitle}</p>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {buildings.length} building pin{buildings.length === 1 ? '' : 's'} on this zone
          </span>
          {anomalyCount > 0 && (
            <span
              className={cn(
                'text-xs font-medium rounded-md border px-2 py-1',
                'border-rose-500/30 bg-rose-500/5 text-rose-700',
              )}
            >
              <AlertTriangle className="size-3.5 mr-1" aria-hidden="true" />
              {anomalyCount} anomaly
            </span>
          )}
          {elevatedCount > 0 && (
            <span
              className={cn(
                'text-xs font-medium rounded-md border px-2 py-1',
                'border-amber-500/30 bg-amber-500/5 text-amber-700',
              )}
            >
              <Sun className="size-3.5 mr-1" aria-hidden="true" />
              {elevatedCount} opportunity
            </span>
          )}
        </div>

        <figure className="relative mx-auto max-w-full">
          <img
            src={cfg.src}
            alt={`${cfg.title} satellite imagery with building pins`}
            // Never intercept pointer events: pins must always be clickable.
            className="block w-full max-w-full rounded-lg border border-border/60 object-cover pointer-events-none shadow-sm"
            style={{ aspectRatio: '16 / 9', maxHeight: '60vh' }}
            loading="eager"
          />

          {/* Building pins — absolutely positioned by normalized coords.
              z-index keeps them above the image; cursor-pointer signals clickability. */}
          {buildings.map((b) => {
            const selected = b.id === selectedId
            const tone = STATUS_COLORS[b.status as CampusBuilding['status']]
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBuilding(b)}
                aria-label={`
                  ${b.name}, ${b.category}, ${
                    b.status
                  }. ${formatKw(b.currentKw)} current draw.
                  Click to view details.
                `.replace(/\s+/g, ' ').trim()}
                aria-pressed={selected}
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 transform',
                  'z-10 cursor-pointer',
                  'transition-transform duration-200',
                  'focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  selected ? 'hover:z-30' : 'hover:z-20',
                  tone.border,
                  tone.bg,
                )}
              >
                <span
                  className={cn(
                    'relative flex flex-col items-center gap-0.5',
                    'rounded-full border px-2 py-1 text-[10px] font-bold shadow-sm backdrop-blur-sm',
                    'whitespace-nowrap',
                    tone.text,
                    selected ? 'ring-3 ring-foreground' : '',
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center rounded-full',
                      tone.dot,
                      'size-5 shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    <MapPin className="size-3 text-white" />
                  </span>
                  <span className="text-[9px] leading-none opacity-90">
                    {b.currentKw.toFixed(0)}<Zap aria-hidden="true" className="ml-0.5 inline size-2.5" />kW
                  </span>
                </span>
              </button>
            )
          })}

          <figcaption className="mt-2 text-center text-[11px] text-muted-foreground">
            Satellite imagery is illustrative Google Earth imagery. Building pins
            are overlaid at approximate coordinates for demonstration.
          </figcaption>
        </figure>

        {/* Selected building detail */}
        <BuildingDetailCard buildingId={selectedId} activeZone={activeZone} />

        {/* Legend */}
        <section
          className="rounded-lg border border-border/50 bg-muted/30 p-3 sm:p-4"
        >
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            Map legend
          </h4>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
            <LegendItem
              label="Normal"
              sub="Within baseline"
              tone={STATUS_COLORS.Normal}
            />
            <LegendItem
              label="Elevated"
              sub="Above baseline — opportunity"
              tone={STATUS_COLORS.Elevated}
            />
            <LegendItem
              label="Critical Anomaly"
              sub="Investigate"
              tone={STATUS_COLORS['Critical Anomaly']}
            />
            <LegendItem
              label="Simulated"
              sub="Not live meter data"
              tone={{ bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', dot: 'bg-muted' }}
            />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Status colors are derived from simulated energy readings and anomaly
            detection results, not physical inspections.
          </p>
        </section>
      </div>
    </Panel>
  )
}

/* ---------------------------------------------------------------------------
 * Legend item
 * --------------------------------------------------------------------------- */

function LegendItem({
  label,
  sub,
  tone,
}: {
  label: string
  sub: string
  tone: { bg: string; border: string; text: string; dot: string }
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'flex items-center justify-center rounded-full',
          tone.dot,
          'size-4 shrink-0',
        )}
        aria-hidden="true"
      >
        <MapPin className="size-2 text-white" />
      </span>
      <div className="flex flex-col leading-none">
        <span className={cn('font-medium', tone.text)}>{label}</span>
        <span className="text-[9px] text-muted-foreground">{sub}</span>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Building detail card — shown below the map when a pin is clicked.
 * --------------------------------------------------------------------------- */

function MetricTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg glass p-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={
          'text-lg font-semibold tabular-nums' + (tone ? ' ' + tone : '')
        }
      >
        {value}
      </span>
      {sub ? (
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      ) : null}
    </div>
  )
}

function formatKw(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  return `${value.toFixed(1)} kW`
}

function formatPercent(numerator: number, denominator: number): string {
  if (!denominator || Number.isNaN(numerator) || Number.isNaN(denominator)) {
    return '—'
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

function BuildingDetailCard({
  buildingId,
  activeZone,
}: {
  buildingId: string | null
  activeZone: CampusZone
}) {
  const zoneTitle = ZONE_CONFIG[activeZone].title

  if (!buildingId) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center gap-2 rounded-lg glass-strong px-6 py-10 text-center"
      >
        <MapPin aria-hidden="true" className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Select a building pin to view its details</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Click any building marker on the campus map to see its category,
          operational status, and energy profile.
        </p>
      </div>
    )
  }

  const b = CAMPUS_BUILDINGS.find((x) => x.id === buildingId)
  if (!b) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-lg glass-strong border-destructive/30 px-4 py-3 text-sm text-muted-foreground"
      >
        <MapPin aria-hidden="true" className="size-4 shrink-0" />
        Selected building details are unavailable.
      </div>
    )
  }

  const hasCurrent = b.currentKw !== null && !Number.isNaN(b.currentKw)
  const hasBaseline = b.baselineKw !== null && !Number.isNaN(b.baselineKw)
  const savingsKw =
    hasCurrent && hasBaseline ? b.baselineKw - b.currentKw : null
  const savingsPct =
    savingsKw !== null && hasBaseline && b.baselineKw > 0
      ? (savingsKw / b.baselineKw) * 100
      : null
  const isSaving = savingsKw !== null && savingsKw > 0

  const tone = STATUS_COLORS[b.status as CampusBuilding['status']]
  const hasAnomaly = b.status === 'Critical Anomaly'
  const hasOpportunity = b.status === 'Elevated'

  return (
    <div className="rounded-lg glass-strong p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{b.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {b.description ?? b.category}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize',
            tone.border,
            tone.bg,
            tone.text,
          )}
        >
          {b.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile
          label="Electricity (current)"
          value={formatKw(b.currentKw)}
          sub="Simulated estimate"
          tone={hasAnomaly ? 'text-rose-700' : hasOpportunity ? 'text-amber-700' : 'text-emerald-700'}
        />
        <MetricTile
          label="Baseline"
          value={formatKw(b.baselineKw)}
          sub="Reference consumption"
        />
        <MetricTile
          label="Savings vs baseline"
          value={savingsKw !== null ? `${Math.abs(savingsKw).toFixed(1)} kW` : '—'}
          sub={
            savingsPct !== null
              ? `${isSaving ? 'under' : 'over'} baseline by ${Math.abs(savingsPct).toFixed(1)}%`
              : 'Not comparable'
          }
          tone={isSaving ? 'text-chart-2' : savingsKw !== null && savingsKw < 0 ? 'text-chart-5' : undefined}
        />
        <MetricTile
          label="Campus zone"
          value={zoneTitle}
          sub={b.zone === 'main' ? 'Main Campus' : 'Residential Zone'}
        />
      </div>

      <div className="mt-4 space-y-2">
        <h5 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Sustainability indicators
        </h5>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between rounded bg-card/30 p-2 border border-border/40 text-sm">
            <span className="text-muted-foreground">Water usage</span>
            <span className="text-[11px] text-muted-foreground italic">
              Simulated estimate
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-card/30 p-2 border border-border/40 text-sm">
            <span className="text-muted-foreground">Waste generation</span>
            <span className="text-[11px] text-muted-foreground italic">
              Simulated estimate
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="flex items-center justify-between rounded bg-card/30 p-2 border border-border/40 text-sm">
            <span className="text-muted-foreground">Water (L/day)</span>
            <span className="text-[11px] font-medium tabular-nums">
              {b.currentWaterLpd != null ? `${b.currentWaterLpd.toFixed(0)}` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-card/30 p-2 border border-border/40 text-sm">
            <span className="text-muted-foreground">Waste (kg/day)</span>
            <span className="text-[11px] font-medium tabular-nums">
              {b.currentWasteKgpd != null ? `${b.currentWasteKgpd.toFixed(1)}` : '—'}
            </span>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Water and waste figures are simulated estimates for demonstration,
          not live sensor readings. All electricity figures are{' '}
          <span style={{ color: '#FFBF00', fontWeight: 600 }}>
            simulated estimates
          </span>{' '}
          from the Digital Twin, not live sensor readings.
        </p>
      </div>

      {(hasAnomaly || hasOpportunity) && (
        <div
          className={cn(
            'mt-4 rounded-lg border p-3 text-sm',
            hasAnomaly
              ? 'border-rose-500/30 bg-rose-500/5 text-rose-700'
              : 'border-amber-500/30 bg-amber-500/5 text-amber-700',
          )}
        >
          <div className="flex items-start gap-2">
            <span
              className={cn(
                'shrink-0 mt-0.5 size-4',
                hasAnomaly ? 'text-rose-600' : 'text-amber-600',
              )}
              aria-hidden="true"
            >
              {hasAnomaly ? <AlertTriangle /> : <Sun />}
            </span>
            <div>
              <p className="font-medium">
                {hasAnomaly
                  ? 'Anomaly detected on this building'
                  : 'Sustainability opportunity detected'}
              </p>
              <p className="text-[11px] leading-relaxed">
                This building&rsquo;s status is <b>{b.status}</b>. Review the
                Sustainability Detective for root-cause hypotheses and
                evidence, or the Action Optimizer for intervention
                recommendations.
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 border-t pt-2.5 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Simulated data.</span>{' '}
        Energy readings are demonstration values generated for the Digital Twin
        and are not live meter measurements.
      </p>
    </div>
  )
}
