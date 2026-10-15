import { getDemoDataset, getEmptyDataset } from '@/lib/ecoloop/demo-data'
import type { DemoScenario } from '@/lib/ecoloop/types'

export const dynamic = 'force-dynamic'

const SCENARIOS: DemoScenario[] = ['normal', 'empty', 'error', 'slow']

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('scenario')
  const scenario: DemoScenario = SCENARIOS.includes(raw as DemoScenario)
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
