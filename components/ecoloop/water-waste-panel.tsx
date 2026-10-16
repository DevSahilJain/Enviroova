'use client'

import {
  formatCurrency,
  formatDecimal,
  formatKwh,
  formatNumber,
} from '@/lib/ecoloop/format'
import { getWaterWasteDataset } from '@/lib/ecoloop/water-waste-data'
import { Droplets, Trash2, AlertTriangle } from 'lucide-react'
import { Panel } from './panel'

interface WaterWastePanelProps {}

export function WaterWastePanel() {
  const dataset = getWaterWasteDataset()

  const totalWaterBaseline = dataset.water.reduce(
    (s, d) => s + d.baselineLitres,
    0,
  )
  const totalWaterActual = dataset.water.reduce((s, d) => s + d.actualLitres, 0)
  const totalWaterExcess = totalWaterActual - totalWaterBaseline

  const totalWasteBaseline = dataset.waste.reduce(
    (s, d) => s + d.baselineKg,
    0,
  )
  const totalWasteActual = dataset.waste.reduce((s, d) => s + d.actualKg, 0)
  const totalWasteExcess = totalWasteActual - totalWasteBaseline

  // Water tariff assumption: ₹5 per 1000 litres (₹0.005/L)
  const waterTariffPerLitre = 0.005
  const waterExcessCost = totalWaterExcess * waterTariffPerLitre

  return (
    <Panel
      title="Water & Waste Management (Simulated)"
      description="Synthetic demonstration module — metrics are illustrative, not live meter data. Integrate real water/waste telemetry to replace these values."
    >
      <div className="space-y-4">
        {/* Simulated banner */}
        <div className="rounded-lg border border-chart-4/40 bg-chart-4/15 p-3 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 size-3.5 shrink-0 text-chart-4"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold">Simulated data.</strong>{' '}
              Water and waste figures are generated for demonstration and do not
              represent actual DSU sensor readings.
            </span>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <dt className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Water usage (actual)</span>
              <Droplets className="size-4 text-chart-4" aria-hidden="true" />
            </dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              {formatNumber(totalWaterActual)} L
            </dd>
            <dd className="mt-1 text-xs text-muted-foreground">
              7-day total
            </dd>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <dt className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Water vs baseline</span>
            </dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              {totalWaterExcess > 0 ? '+' : ''}
              {formatNumber(totalWaterExcess)} L
            </dd>
            <dd className="mt-1 text-xs text-muted-foreground">
              Excess vs baseline
            </dd>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <dt className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Waste generation (actual)</span>
              <Trash2 className="size-4 text-chart-4" aria-hidden="true" />
            </dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              {formatDecimal(totalWasteActual)} kg
            </dd>
            <dd className="mt-1 text-xs text-muted-foreground">
              7-day total
            </dd>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <dt className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Excess water cost</span>
            </dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              {formatCurrency(waterExcessCost)}
            </dd>
            <dd className="mt-1 text-xs text-muted-foreground">
              @ ₹{waterTariffPerLitre * 1000}/1000 L
            </dd>
          </div>
        </div>

        {/* Daily table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">
              Daily water and waste usage vs baseline
            </caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Date
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Water baseline (L)
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Water actual (L)
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Waste baseline (kg)
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Waste actual (kg)
                </th>
              </tr>
            </thead>
            <tbody>
              {dataset.water.map((w, i) => {
                const waste = dataset.waste[i]
                return (
                  <tr key={w.date} className="border-b last:border-0">
                    <th scope="row" className="py-2 pr-4 text-left font-normal">
                      {w.date}
                    </th>
                    <td className="py-2 pr-4 text-right">
                      {formatNumber(w.baselineLitres)}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {formatNumber(w.actualLitres)}
                    </td>
                    <td className="py-2 text-right">
                      {formatDecimal(waste.baselineKg)}
                    </td>
                    <td className="py-2 text-right">
                      {formatDecimal(waste.actualKg)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Water tariff assumption: ₹{waterTariffPerLitre * 1000} per 1000
          litres. This is a configurable placeholder — replace with actual
          utility rates when real data is integrated.
        </p>
      </div>
    </Panel>
  )
}
