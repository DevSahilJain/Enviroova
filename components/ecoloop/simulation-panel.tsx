'use client'

import { useId } from 'react'
import { Lightbulb, Plug, RotateCcw, Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatHour } from '@/lib/ecoloop/format'
import { DEFAULT_CONFIG } from '@/lib/ecoloop/simulation'
import type { SimulationConfig } from '@/lib/ecoloop/types'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

interface SimulationPanelProps {
  config: SimulationConfig
  onChange: (config: SimulationConfig) => void
}

function Switch({
  checked,
  onChange,
  labelledBy,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  labelledBy: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        checked ? 'border-primary bg-primary' : 'bg-muted',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-0.5 left-0.5 size-3.5 rounded-full bg-background shadow-sm transition-transform',
          checked && 'translate-x-4',
        )}
      />
    </button>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  disabled: boolean
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="text-muted-foreground">
          {label}
        </label>
        <output htmlFor={id} className="font-medium tabular-nums">
          {value}
          {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-5 w-full cursor-pointer accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  )
}

function HourRange({
  label,
  start,
  end,
  disabled,
  onChange,
}: {
  label: string
  start: number
  end: number
  disabled: boolean
  onChange: (start: number, end: number) => void
}) {
  const startId = useId()
  const endId = useId()
  const options = Array.from({ length: 24 }, (_, h) => h)
  const selectClass =
    'h-8 w-full rounded-md border bg-background px-2 text-xs disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring'
  return (
    <fieldset disabled={disabled} className="space-y-1.5">
      <legend className="mb-1.5 text-xs text-muted-foreground">{label}</legend>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={startId} className="sr-only">
            {label} start hour (UTC)
          </label>
          <select
            id={startId}
            value={start}
            onChange={(e) => onChange(Number(e.target.value), end)}
            className={selectClass}
          >
            {options.map((h) => (
              <option key={h} value={h}>
                From {formatHour(h)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={endId} className="sr-only">
            {label} end hour (UTC)
          </label>
          <select
            id={endId}
            value={end}
            onChange={(e) => onChange(start, Number(e.target.value))}
            className={selectClass}
          >
            {options.map((h) => (
              <option key={h} value={h}>
                Until {formatHour(h)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  )
}

function Measure({
  icon,
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
  onToggle: (value: boolean) => void
  children: React.ReactNode
}) {
  const titleId = useId()
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'space-y-3 rounded-lg border p-3 transition-colors',
        !enabled && 'bg-muted/40',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-sm font-medium">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch checked={enabled} onChange={onToggle} labelledBy={titleId} />
      </div>
      <div className={cn('space-y-3', !enabled && 'opacity-60')}>
        {children}
      </div>
    </section>
  )
}

export function SimulationPanel({ config, onChange }: SimulationPanelProps) {
  const { hvac, lighting, equipment } = config

  return (
    <Panel
      title="What-if simulator"
      description="Adjust interventions; results update instantly against the baseline"
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_CONFIG)}
        >
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
      }
    >
      <div className="space-y-3">
        <Measure
          icon={<Thermometer className="size-4" aria-hidden="true" />}
          title="HVAC scheduling"
          description="Temperature setback outside occupied hours"
          enabled={hvac.enabled}
          onToggle={(enabled) => onChange({ ...config, hvac: { ...hvac, enabled } })}
        >
          <Slider
            label="Setback"
            value={hvac.setbackC}
            min={0}
            max={4}
            step={0.5}
            unit=" °C"
            disabled={!hvac.enabled}
            onChange={(setbackC) =>
              onChange({ ...config, hvac: { ...hvac, setbackC } })
            }
          />
          <HourRange
            label="Setback window (UTC)"
            start={hvac.startHour}
            end={hvac.endHour}
            disabled={!hvac.enabled}
            onChange={(startHour, endHour) =>
              onChange({ ...config, hvac: { ...hvac, startHour, endHour } })
            }
          />
        </Measure>

        <Measure
          icon={<Lightbulb className="size-4" aria-hidden="true" />}
          title="Lighting optimization"
          description="Dimming and occupancy-based control"
          enabled={lighting.enabled}
          onToggle={(enabled) =>
            onChange({ ...config, lighting: { ...lighting, enabled } })
          }
        >
          <Slider
            label="Lighting load reduction"
            value={lighting.reductionPct}
            min={0}
            max={50}
            step={5}
            unit="%"
            disabled={!lighting.enabled}
            onChange={(reductionPct) =>
              onChange({ ...config, lighting: { ...lighting, reductionPct } })
            }
          />
        </Measure>

        <Measure
          icon={<Plug className="size-4" aria-hidden="true" />}
          title="Unused equipment shutdown"
          description="Switch off idle plug loads when the building is empty"
          enabled={equipment.enabled}
          onToggle={(enabled) =>
            onChange({ ...config, equipment: { ...equipment, enabled } })
          }
        >
          <Slider
            label="Idle equipment switched off"
            value={equipment.shutdownPct}
            min={0}
            max={100}
            step={5}
            unit="%"
            disabled={!equipment.enabled}
            onChange={(shutdownPct) =>
              onChange({ ...config, equipment: { ...equipment, shutdownPct } })
            }
          />
          <HourRange
            label="Shutdown window (UTC)"
            start={equipment.startHour}
            end={equipment.endHour}
            disabled={!equipment.enabled}
            onChange={(startHour, endHour) =>
              onChange({
                ...config,
                equipment: { ...equipment, startHour, endHour },
              })
            }
          />
        </Measure>
      </div>
    </Panel>
  )
}
