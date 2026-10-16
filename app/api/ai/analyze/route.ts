import { NextResponse } from 'next/server'

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const MAX_MESSAGE_LENGTH = 1000
const REQUEST_TIMEOUT_MS = 25_000
const MAX_OUTPUT_TOKENS = 250

export const dynamic = 'force-dynamic'

function sanitizeProviderError(message: string | undefined): string {
  if (!message) return 'No error details provided by NVIDIA NIM.'
  return message
    .replace(/sk-[A-Za-z0-9_\-]{20,}/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    .slice(0, 500)
}

function statusError(status: number): { error: string; detail?: string } {
  switch (status) {
    case 401:
    case 403:
      return {
        error: 'NVIDIA API key is invalid or expired.',
        detail: 'Verify NVIDIA_API_KEY in Vercel environment variables.',
      }
    case 429:
      return {
        error: 'NVIDIA NIM rate limit exceeded.',
        detail: 'Wait a moment and try again.',
      }
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        error: `NVIDIA NIM server error (HTTP ${status}).`,
        detail: 'Please try again later.',
      }
    default:
      return { error: `NVIDIA NIM request failed (HTTP ${status}).` }
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { message } = body as { message?: string }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 },
      )
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters).` },
        { status: 400 },
      )
    }

    const apiKey = process.env.NVIDIA_API_KEY
    const model = process.env.NVIDIA_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct'

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'AI analyst is not configured. Add NVIDIA_API_KEY to Vercel environment variables to enable it.',
          configured: false,
        },
        { status: 503 },
      )
    }

    const systemPrompt = `You are an AI Sustainability Analyst for a campus energy dashboard (DSU).
All dashboard figures are simulated demonstration data, not real measurements.
Provide practical, high-level sustainability suggestions. Never claim AI suggestions are verified measurements or actual campus findings.
Recommend field verification and professional audit before acting.
Be concise.`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.5,
          max_tokens: MAX_OUTPUT_TOKENS,
          stream: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const durationMs = Date.now() - startTime

      if (!response.ok) {
        let upstreamMessage = 'Upstream API error.'
        try {
          const errBody = await response.json()
          upstreamMessage = sanitizeProviderError(
            errBody?.message ?? errBody?.error ?? upstreamMessage,
          )
        } catch {
          // ignore parse errors
        }
        const mapped = statusError(response.status)
        return NextResponse.json(
          {
            error: mapped.error,
            detail: mapped.detail ?? upstreamMessage,
            durationMs,
            configured: true,
          },
          { status: 502 },
        )
      }

      const data = await response.json()
      const content =
        data?.choices?.[0]?.message?.content ??
        'No response from AI analyst.'

      return NextResponse.json({
        reply: content,
        model,
        durationMs,
        configured: true,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      const durationMs = Date.now() - startTime
      if (err instanceof Error && err.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'AI analyst request timed out. Please try again.',
            detail: `No response from NVIDIA NIM within ${REQUEST_TIMEOUT_MS / 1000}s.`,
            durationMs,
            configured: true,
          },
          { status: 504 },
        )
      }
      return NextResponse.json(
        {
          error: 'AI analyst request failed.',
          durationMs,
          configured: true,
        },
        { status: 500 },
      )
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    )
  }
}
