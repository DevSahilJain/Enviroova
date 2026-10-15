'use client'

import { useMemo, useState } from 'react'
import { Leaf } from 'lucide-react'
import { DEFAULT_CONFIG, simulate } from '@/lib/ecoloop/simulation'
import type {
  DemoScenario,
  EnergyDataset,
  SimulationConfig,
} from '@/lib/ecoloop/types'
import { useEnergyData } from '@/lib/ecoloop/use-energy-data'
import { AnomalyPanel } from './anomaly-panel'
import { DemoBanner } from './demo-banner'
import { EnergyChart } from './energy-chart'
import { KpiCards } from './kpi-cards'
import { ResultsPanel } from './results-panel'
import { SimulationPanel } from './simulation-panel'
import { DashboardSkeleton, EmptyState, ErrorState } from './states'
import { formatDay } from '@/lib/ecoloop/format'

function DashboardContent({ dataset }: { dataset: EnergyDataset }) {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG)
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(
    dataset.anomalies[0]?.id ?? null,
  )

  const simulation = useMemo(
    () => simulate(dataset.series, config, dataset.meta.assumptions),
    [dataset, config],
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
            isSynthetic={dataset.meta.isSynthetic}
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
          assumptions={dataset.meta.assumptions}
          onLoadConfig={setConfig}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Simulation is a screening-level estimate. Assumptions: $
        {dataset.meta.assumptions.tariffPerKwh.toFixed(2)}/kWh,{' '}
        {dataset.meta.assumptions.emissionFactorKgPerKwh} kg CO2e/kWh. All
        times UTC.
      </p>
    </div>
  )
}

export function Dashboard() {
  const [scenario, setScenario] = useState<DemoScenario>('normal')
  const [source, setSource] = useState<'demo' | 'database'>('database')
  const { data, error, isLoading, mutate } = useEnergyData(
    scenario,
    source,
  )

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
    body = <DashboardContent key={data.meta.periodStart} dataset={data} />
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
                ECOLOOP
              </h1>
              <p className="text-xs text-muted-foreground">
                Campus energy sustainability
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Data source</span>
              <select
                value={source}
                onChange={(event) =>
                  setSource(event.target.value as 'demo' | 'database')
                }
                className="rounded-md border bg-background px-3 py-2"
              >
                <option value="database">Imported readings</option>
                <option value="demo">Demo data</option>
              </select>
            </label>
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
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">{body}</main>
    </div>
  )
}
