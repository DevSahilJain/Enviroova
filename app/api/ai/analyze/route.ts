import { NextResponse } from 'next/server'

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const MAX_MESSAGE_LENGTH = 1000
const REQUEST_TIMEOUT_MS = 30_000

export const dynamic = 'force-dynamic'

function sanitizeProviderError(message: string | undefined): string {
  if (!message) return 'No error details provided by NVIDIA NIM.'
  // Strip potential secrets/tokens from provider error messages.
  return message
    .replace(/sk-[A-Za-z0-9_\-]{20,}/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    .slice(0, 500)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message } = body as { message?: string }

    // Validate input
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

    // Build system prompt that grounds the assistant in sustainability context
    // and explicitly frames data as simulated/demo when applicable.
    const systemPrompt = `You are an AI Sustainability Analyst for a campus energy dashboard (DSU).
You provide practical, high-level sustainability suggestions based on the user's question.
You do NOT have access to live meter readings unless they are explicitly included in the conversation context below.
All dashboard figures shown in this demo are simulated demonstration data, not real measurements.
Never claim AI suggestions are verified measurements, actual campus findings, or engineering-grade advice.
Always recommend field verification and professional audit before acting on suggestions.
Be concise, practical, and safety-conscious.`

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
          max_tokens: 500,
          stream: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

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
        return NextResponse.json(
          {
            error: `NVIDIA NIM request failed (HTTP ${response.status}).`,
            detail: upstreamMessage,
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
        configured: true,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        return NextResponse.json(
          { error: 'AI analyst request timed out. Please try again.', configured: true },
          { status: 504 },
        )
      }
      return NextResponse.json(
        { error: 'AI analyst request failed.', configured: true },
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
