'use client'

import { useMemo, useState } from 'react'
import { Leaf } from 'lucide-react'
import { DEFAULT_CONFIG, simulate } from '@/lib/ecoloop/simulation'
import { OPTIMIZER_TARIFF } from '@/lib/ecoloop/optimizer'
import type {
  DemoScenario,
  EnergyDataset,
  SimulationConfig,
} from '@/lib/ecoloop/types'
import { useEnergyData } from '@/lib/ecoloop/use-energy-data'
import { AnomalyPanel } from './anomaly-panel'
import { CampusDigitalTwinMap } from './digital-twin-map'
import { DemoBanner } from './demo-banner'
import { EnergyChart } from './energy-chart'
import { KpiCards } from './kpi-cards'
import { ResultsPanel } from './results-panel'
import { SimulationPanel } from './simulation-panel'
import { DashboardSkeleton, EmptyState, ErrorState } from './states'
import { OptimizerPanel } from './optimizer-panel'
import { WaterWastePanel } from './water-waste-panel'
import { formatDay } from '@/lib/ecoloop/format'

function DashboardContent({
  dataset,
  tariff,
  onTariffChange,
}: {
  dataset: EnergyDataset
  tariff: number
  onTariffChange: (value: number) => void
}) {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG)
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(
    dataset.anomalies[0]?.id ?? null,
  )

  const simulation = useMemo(
    () => simulate(dataset.series, config, { ...dataset.meta.assumptions, tariffPerKwh: tariff }),
    [dataset, config, tariff],
  )

  return (
    <div className="space-y-6">
      <KpiCards
        series={dataset.series}
        anomalies={dataset.anomalies}
        simulation={simulation}
      />
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <EnergyChart
            series={dataset.series}
            anomalies={dataset.anomalies}
            simulation={simulation}
            selectedAnomalyId={selectedAnomalyId}
          />
        </div>
        <AnomalyPanel
          anomalies={dataset.anomalies}
          selectedId={selectedAnomalyId}
          onSelect={setSelectedAnomalyId}
        />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <SimulationPanel config={config} onChange={setConfig} />
        <ResultsPanel
          series={dataset.series}
          simulation={simulation}
          verification={dataset.verification}
          assumptions={{ ...dataset.meta.assumptions, tariffPerKwh: tariff }}
          onLoadConfig={setConfig}
        />
      </div>
      <CampusDigitalTwinMap />
      <OptimizerPanel tariff={tariff} />
      <WaterWastePanel />
      <p className="text-xs text-muted-foreground">
        Simulation is a screening-level estimate. Assumptions: ₹{' '}
        {tariff.toFixed(2)}/kWh,{' '}
        {dataset.meta.assumptions.emissionFactorKgPerKwh} kg CO2e/kWh. All
        times shown in IST (UTC+5:30).
      </p>
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm">
        <p className="font-medium text-foreground mb-2">How the numbers relate</p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
          <li>
            <strong>Baseline energy:</strong> Modelled expected consumption for
            this period, derived from the building model.
          </li>
          <li>
            <strong>Actual energy:</strong> Observed consumption from meters.
            It can exceed the baseline due to flagged anomalies and unplanned
            load — this does not mean savings are negative.
          </li>
          <li>
            <strong>Estimated savings:</strong> A what-if scenario showing how
            much energy could be saved by applying the interventions in the
            simulator. It is independent of actual vs baseline comparison.
          </li>
        </ul>
      </div>
    </div>
  )
}

export function Dashboard() {
  const [scenario, setScenario] = useState<DemoScenario>('normal')
  const [tariff, setTariff] = useState<number>(OPTIMIZER_TARIFF)
  const { data, error, isLoading, mutate } = useEnergyData(scenario)

  let body: React.ReactNode
  if (isLoading) {
    body = <DashboardSkeleton />
  } else if (error) {
    body = (
      <ErrorState
        title="Energy data could not be loaded"
        description={error.message}
        action={{ label: 'Try again', onClick: () => mutate() }}
      />
    )
  } else if (!data || data.series.length === 0) {
    body = (
      <EmptyState
        title="No energy readings for this period"
        description="Once meter data is available for the selected period it will appear here, along with anomalies and simulations."
        action={{ label: 'Reload', onClick: () => mutate() }}
      />
    )
  } else {
    // Keyed so simulation and selection state reset when the dataset changes
    body = <DashboardContent key={data.meta.periodStart} dataset={data} tariff={tariff} onTariffChange={setTariff} />
  }

  return (
    <div className="min-h-screen">
      <DemoBanner scenario={scenario} onScenarioChange={setScenario} />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-primary p-2 text-primary-foreground">
              <Leaf aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h1 className="text-lg leading-tight font-semibold tracking-tight">
                Enviroova
              </h1>
              <p className="text-xs text-muted-foreground">
                Campus energy sustainability
              </p>
            </div>
          </div>
          {data && data.series.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {data.meta.siteName} &middot;{' '}
              <time dateTime={data.meta.periodStart}>
                {formatDay(data.meta.periodStart)}
              </time>{' '}
              to{' '}
              <time dateTime={data.meta.periodEnd}>
                {formatDay(data.meta.periodEnd)}
              </time>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="dashboard-tariff" className="text-xs text-muted-foreground shrink-0">
            Tariff (₹/kWh)
          </label>
          <input
            id="dashboard-tariff"
            type="number"
            min={0}
            step={0.1}
            value={tariff}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v) && v > 0) setTariff(v)
            }}
            className="h-7 w-16 rounded-md border bg-background px-2 text-xs focus-visible:outline-2 focus-visible:outline-ring"
          />
          <span className="text-xs text-muted-foreground">
            per kWh — affects cost/payback calcs
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="dashboard-tariff" className="text-xs text-muted-foreground shrink-0">
            Tariff (₹/kWh)
          </label>
          <input
            id="dashboard-tariff"
            type="number"
            min={0}
            step={0.1}
            value={tariff}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v) && v > 0) setTariff(v)
            }}
            className="h-7 w-16 rounded-md border bg-background px-2 text-xs focus-visible:outline-2 focus-visible:outline-ring"
          />
          <span className="text-xs text-muted-foreground">
            per kWh — affects cost/payback calcs
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">{body}</main>
    </div>
  )
}
