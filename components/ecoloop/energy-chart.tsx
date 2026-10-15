'use client'

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatDay, formatKwh } from '@/lib/ecoloop/format'
import type {
  Anomaly,
  EnergyPoint,
  SimulationResult,
} from '@/lib/ecoloop/types'
import { Panel } from './panel'

const HOUR_MS = 3_600_000

interface EnergyChartProps {
  series: EnergyPoint[]
  anomalies: Anomaly[]
  simulation: SimulationResult
  selectedAnomalyId: string | null
}

interface ChartRow {
  t: number
  expected: number
  actual: number
  predicted: number
}

function LegendItem({
  label,
  dash,
  color,
}: {
  label: string
  dash?: string
  color: string
}) {
  return (
    <li className="flex items-center gap-2">
      <svg width="24" height="8" aria-hidden="true">
        <line
          x1="0"
          y1="4"
          x2="24"
          y2="4"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={dash}
        />
      </svg>
      {label}
    </li>
  )
}

function ChartTooltip({
  active,
  payload,
  showPredicted,
}: {
  active?: boolean
  payload?: { payload: ChartRow }[]
  showPredicted: boolean
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const deviation = row.actual - row.expected
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">
        {formatDateTime(new Date(row.t).toISOString())} UTC
      </p>
      <dl className="space-y-0.5 tabular-nums">
        <div className="flex justify-between gap-6">
          <dt className="text-muted-foreground">Expected</dt>
          <dd>{formatKwh(row.expected)}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-muted-foreground">Actual</dt>
          <dd>{formatKwh(row.actual)}</dd>
        </div>
        {showPredicted ? (
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Simulated</dt>
            <dd>{formatKwh(row.predicted)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-6 border-t pt-0.5">
          <dt className="text-muted-foreground">Deviation</dt>
          <dd>
            {deviation >= 0 ? '+' : '-'}
            {Math.abs(deviation).toFixed(1)} kWh
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function EnergyChart({
  series,
  anomalies,
  simulation,
  selectedAnomalyId,
}: EnergyChartProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [showSimulated, setShowSimulated] = useState(true)
  const hasSimulation = simulation.totals.savingsKwh > 0.5
  const showPredicted = showSimulated && hasSimulation

  const data = useMemo<ChartRow[]>(
    () =>
      series.map((p, i) => ({
        t: new Date(p.timestamp).getTime(),
        expected: p.expectedKwh,
        actual: p.actualKwh,
        predicted: simulation.points[i]?.predictedKwh ?? p.expectedKwh,
      })),
    [series, simulation.points],
  )

  const dailyTotals = useMemo(() => {
    const days = new Map<
      string,
      { expected: number; actual: number; predicted: number }
    >()
    data.forEach((row) => {
      const key = new Date(row.t).toISOString().slice(0, 10)
      const d = days.get(key) ?? { expected: 0, actual: 0, predicted: 0 }
      d.expected += row.expected
      d.actual += row.actual
      d.predicted += row.predicted
      days.set(key, d)
    })
    return Array.from(days, ([key, v]) => ({ key, ...v }))
  }, [data])

  const dayTicks = useMemo(
    () =>
      data
        .filter((row) => new Date(row.t).getUTCHours() === 0)
        .map((row) => row.t),
    [data],
  )

  const summary = `Hourly energy use over 7 days in kWh, comparing expected and actual consumption. ${anomalies.length} anomalous windows are shaded.`

  return (
    <Panel
      title="Energy consumption"
      description="Expected versus actual hourly usage (kWh), 7 days, UTC"
      actions={
        <div
          role="group"
          aria-label="Chart display"
          className="flex items-center gap-1"
        >
          <Button
            variant={view === 'chart' ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={view === 'chart'}
            onClick={() => setView('chart')}
          >
            Chart
          </Button>
          <Button
            variant={view === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={view === 'table'}
            onClick={() => setView('table')}
          >
            Daily table
          </Button>
        </div>
      }
    >
      {view === 'chart' ? (
        <>
          <ul className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
            <LegendItem
              label="Expected"
              color="var(--muted-foreground)"
              dash="5 4"
            />
            <LegendItem label="Actual" color="var(--chart-1)" />
            {showPredicted ? (
              <LegendItem
                label="Simulated"
                color="var(--chart-2)"
                dash="1 4"
              />
            ) : null}
            <li className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-6 rounded-sm bg-chart-4/35"
              />
              Anomaly window
            </li>
            {hasSimulation ? (
              <li className="ml-auto">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showSimulated}
                    onChange={(e) => setShowSimulated(e.target.checked)}
                    className="size-3.5 accent-[var(--primary)]"
                  />
                  Show simulated usage
                </label>
              </li>
            ) : null}
          </ul>
          <div
            role="img"
            aria-label={summary}
            className="h-72 w-full sm:h-80"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
                accessibilityLayer={false}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  ticks={dayTicks}
                  tickFormatter={(v: number) => formatDay(v)}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => `${v}`}
                  label={{
                    value: 'kWh per hour',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 18,
                    style: {
                      fontSize: 11,
                      fill: 'var(--muted-foreground)',
                      textAnchor: 'middle',
                    },
                  }}
                />
                <Tooltip
                  content={<ChartTooltip showPredicted={showPredicted} />}
                  cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
                />
                {anomalies.map((a) => {
                  const selected = a.id === selectedAnomalyId
                  return (
                    <ReferenceArea
                      key={a.id}
                      x1={new Date(a.startTimestamp).getTime()}
                      x2={new Date(a.endTimestamp).getTime() + HOUR_MS}
                      fill="var(--chart-4)"
                      fillOpacity={selected ? 0.4 : 0.18}
                      stroke={selected ? 'var(--chart-4)' : undefined}
                      strokeOpacity={0.8}
                      ifOverflow="visible"
                    />
                  )
                })}
                <Line
                  dataKey="expected"
                  name="Expected"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1.75}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                {showPredicted ? (
                  <Line
                    dataKey="predicted"
                    name="Simulated"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    strokeDasharray="1 4"
                    strokeLinecap="round"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                ) : null}
                <Line
                  dataKey="actual"
                  name="Actual"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm tabular-nums">
            <caption className="sr-only">
              Daily energy totals in kWh: expected, actual, and simulated
            </caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Day (UTC)
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Expected
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Actual
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Simulated
                </th>
              </tr>
            </thead>
            <tbody>
              {dailyTotals.map((d) => (
                <tr key={d.key} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    {formatDay(`${d.key}T00:00:00Z`)}
                  </th>
                  <td className="py-2 pr-4 text-right">
                    {formatKwh(d.expected)}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {formatKwh(d.actual)}
                  </td>
                  <td className="py-2 text-right">
                    {formatKwh(d.predicted)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
