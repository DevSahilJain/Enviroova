import { getDemoDataset } from '@/lib/ecoloop/demo-data'

export const dynamic = 'force-dynamic'

/**
 * Reports whether a live energy provider is configured.
 *
 * Honest about what we can and cannot verify:
 * - configured: true only when ENERGY_API_KEY is present on the server.
 *   Merely having the key does NOT mean the connection works.
 * - connected: always false unless the server has actually completed a
 *   successful request to a real provider (not implemented here, since no
 *   real provider URL is configured).
 */
export async function GET() {
  const configured = Boolean(process.env.ENERGY_API_KEY)

  return Response.json({
    liveProviderConfigured: configured,
    connectionVerified: false,
  })
}
