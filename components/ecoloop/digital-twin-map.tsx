'use client'

import { useState } from 'react'
import { MapPin, Zap } from 'lucide-react'
import {
  CAMPUS_BUILDINGS,
  type CampusBuilding,
  type CampusZone,
  statusTone,
  ZONE_CONFIG,
} from '@/lib/ecoloop/digital-twin'
import { Panel } from './panel'

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
 * Earth campus images served from public/images/.
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

  return (
    <Panel
      title="Campus Digital Twin Lite"
      description="Interactive satellite overlay with clickable building pins"
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
          <p className="text-xs text-muted-foreground">{cfg.subtitle}</p>
          <span className="text-[11px] text-muted-foreground">
            {buildings.length} building pin{buildings.length === 1 ? '' : 's'} on this zone
          </span>
        </div>

        <figure className="relative mx-auto max-w-full">
          <img
            src={cfg.src}
            alt={`${cfg.title} satellite imagery with building pins`}
            // Never intercept pointer events: pins must always be clickable.
            className="block w-full max-w-full rounded-lg border object-cover pointer-events-none"
            style={{ aspectRatio: '16 / 9', maxHeight: '60vh' }}
          />

          {/* Building pins — absolutely positioned by normalized coords.
              z-index keeps them above the image; cursor-pointer signals clickability. */}
          {buildings.map((b) => {
            const selected = b.id === selectedId
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBuilding(b)}
                aria-label={`${b.name}, ${b.category}, ${b.currentKw} kW current draw, status ${b.status}`}
                aria-pressed={selected}
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
                className={
                  'absolute -translate-x-1/2 -translate-y-1/2 transform' +
                  ' z-10 cursor-pointer' +
                  ' transition-transform hover:z-20 focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
                }
              >
                <span
                  className={
                    'relative flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium shadow-md backdrop-blur-sm' +
                    ' ' +
                    statusTone(b.status) +
                    (selected ? ' ring-2 ring-foreground' : '')
                  }
                >
                  <MapPin className="size-3 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">
                    {b.currentKw.toFixed(0)}<Zap aria-hidden="true" className="ml-0.5 inline size-3" />kW
                  </span>
                </span>
              </button>
            )
          })}

          <figcaption className="mt-2 text-center text-[11px] text-muted-foreground">
            Satellite imagery is illustrative Google Earth imagery. Building pins are
            overlaid at approximate coordinates for demonstration.
          </figcaption>
        </figure>

        {/* Selected building detail */}
        <BuildingDetailCard buildingId={selectedId} activeZone={activeZone} />
      </div>
    </Panel>
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
          className={
            'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize' +
            ' ' +
            statusTone(b.status)
          }
        >
          {b.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile
          label="Current draw"
          value={formatKw(b.currentKw)}
          sub="Live metered draw"
        />
        <MetricTile
          label="Baseline"
          value={formatKw(b.baselineKw)}
          sub="Reference consumption"
        />
        <MetricTile
          label="Savings"
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

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          Category: {b.category}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin aria-hidden="true" className="size-3" />
          Zone: {zoneTitle}
        </span>
      </div>

      <p className="mt-3 border-t pt-2.5 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Simulated data.</span>{' '}
        Energy readings are demonstration values generated for the Digital Twin
        and are not live meter measurements.
      </p>
    </div>
  )
}