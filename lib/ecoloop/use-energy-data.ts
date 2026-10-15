'use client'

import useSWR from 'swr'
import type { DemoScenario, EnergyDataset } from './types'

async function fetchDataset(url: string): Promise<EnergyDataset> {
  const response = await fetch(url)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? `Request failed with status ${response.status}`)
  }
  return response.json()
}

export function useEnergyData(scenario: DemoScenario) {
  return useSWR<EnergyDataset, Error>(
    `/api/energy?scenario=${scenario}`,
    fetchDataset,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )
}
