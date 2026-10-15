import {
  getDemoDataset,
  getEmptyDataset,
} from '@/lib/ecoloop/demo-data'
import type {
  DemoScenario,
  EnergyDataset,
  EnergyPoint,
} from '@/lib/ecoloop/types'
import { supabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const SCENARIOS: DemoScenario[] = [
  'normal',
  'empty',
  'error',
  'slow',
]

async function getDatabaseDataset(): Promise<EnergyDataset> {
  const { data, error } = await supabase
    .from('energy_readings')
    .select(
      'site_name, building_name, recorded_at, hvac_kwh, lighting_kwh, equipment_kwh, other_kwh',
    )
    .order('recorded_at', { ascending: true })
    .limit(1000)

  if (error) {
    console.error('Energy readings query failed:', error.message)
    throw new Error('Could not load energy readings.')
  }

  const rows = data ?? []

  const series: EnergyPoint[] = rows.map((row) => {
    const hvacKwh = Number(row.hvac_kwh)
    const lightingKwh = Number(row.lighting_kwh)
    const equipmentKwh = Number(row.equipment_kwh)
    const otherKwh = Number(row.other_kwh)

    return {
      timestamp: new Date(row.recorded_at).toISOString(),
      expectedKwh: hvacKwh + lightingKwh + equipmentKwh + otherKwh,
      actualKwh: hvacKwh + lightingKwh + equipmentKwh + otherKwh,
      occupancy: 0,
      breakdown: {
        hvacKwh,
        lightingKwh,
        equipmentKwh,
        otherKwh,
      },
    }
  })

  const fallback = getEmptyDataset()
  const siteName = rows[0]?.site_name ?? 'Demo Campus'

  return {
    ...fallback,
    meta: {
      ...fallback.meta,
      isSynthetic: false,
      datasetLabel: 'Imported meter readings',
      siteName,
      periodStart: series[0]?.timestamp ?? '',
      periodEnd: series[series.length - 1]?.timestamp ?? '',
      assumptions: fallback.meta.assumptions,
    },
    series,
    anomalies: [],
    verification: [],
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const raw = params.get('scenario')
  const mode = params.get('source')

  if (mode === 'database') {
    try {
      return Response.json(await getDatabaseDataset())
    } catch {
      return Response.json(
        { error: 'Could not load database readings.' },
        { status: 500 },
      )
    }
  }

  const scenario: DemoScenario = SCENARIOS.includes(
    raw as DemoScenario,
  )
    ? (raw as DemoScenario)
    : 'normal'

  if (scenario === 'error') {
    return Response.json(
      { error: 'The demo data service is unavailable.' },
      { status: 503 },
    )
  }

  if (scenario === 'slow') {
    await new Promise((resolve) => setTimeout(resolve, 2500))
  }

  return Response.json(
    scenario === 'empty' ? getEmptyDataset() : getDemoDataset(),
  )
}