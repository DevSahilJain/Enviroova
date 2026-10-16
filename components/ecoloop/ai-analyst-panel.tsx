'use client'

import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, Bot, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from './panel'
import { cn } from '@/lib/utils'

interface AiAnalystPanelProps {
  /** Optional dashboard context to send to the model (simulated data flagged as such). */
  context?: {
    baselineKwh?: number
    actualKwh?: number
    savingsKwh?: number
    tariffPerKwh?: number
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const MAX_MESSAGE_LENGTH = 1000

export function AiAnalystPanel({
  context,
}: AiAnalystPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const buildContextString = useCallback(() => {
    if (!context) {
      return 'No dashboard context available.'
    }
    const parts: string[] = []
    if (context.baselineKwh !== undefined) {
      parts.push(`Baseline energy (modelled expected): ${context.baselineKwh.toFixed(0)} kWh`)
    }
    if (context.actualKwh !== undefined) {
      parts.push(`Actual energy (observed): ${context.actualKwh.toFixed(0)} kWh`)
    }
    if (context.savingsKwh !== undefined) {
      parts.push(`Estimated savings (what-if scenario): ${context.savingsKwh.toFixed(0)} kWh`)
    }
    if (context.tariffPerKwh !== undefined) {
      parts.push(`Electricity tariff: ₹${context.tariffPerKwh.toFixed(2)}/kWh`)
    }
    parts.push('IMPORTANT: All figures above are simulated demonstration data, not real measurements.')
    return parts.join('. ') + '.'
  }, [context])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || status === 'loading') return

    const userMessage: Message = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setStatus('loading')
    setErrorMessage('')

    const contextString = buildContextString()
    const fullMessage = `${trimmed}\n\nDashboard context (simulated/demo data unless noted otherwise): ${contextString}`

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullMessage }),
      })

      if (!response.ok) {
        let detail = ''
        try {
          const err = await response.json()
          detail = err?.detail ?? err?.error ?? ''
        } catch {
          // ignore parse errors
        }
        throw new Error(detail || `Server returned ${response.status}`)
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data?.reply ?? 'No response from AI analyst.',
      }
      setMessages((prev) => [...prev, assistantMessage])
      setStatus('idle')
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'AI analyst request failed.'
      setErrorMessage(msg)
      setStatus('error')
    }
  }

  const handleRetry = () => {
    setStatus('idle')
    setErrorMessage('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    setStatus('idle')
    setErrorMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <Panel
      title="AI Sustainability Analyst"
      description="Ask questions about campus sustainability and get practical suggestions. All data shown is simulated demonstration data. AI suggestions are not verified measurements — verify with a site audit before acting."
    >
      {/* Conversation area */}
      <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2">
        {messages.length === 0 && (
          <div className="text-xs text-muted-foreground italic">
            No conversation yet. Ask something like &ldquo;How can I reduce
            overnight HVAC load?&rdquo;
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'rounded-lg p-3 text-xs break-words',
              m.role === 'user'
                ? 'bg-primary/10 text-primary-foreground border border-primary/20'
                : 'bg-muted text-muted-foreground border border-border/30',
            )}
          >
            {m.role === 'user' ? (
              <div className="flex items-start gap-2">
                <Bot className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{m.content}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Bot className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>{m.content}</span>
              </div>
            )}
          </div>
        ))}
        {status === 'loading' && (
          <div className="flex items-start gap-2">
            <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">
              AI analyst is thinking…
            </span>
          </div>
        )}
        {status === 'error' && errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertTriangle className="size-3.5 shrink-0 mr-1" aria-hidden="true" />
            {errorMessage}
            <button
              type="button"
              onClick={handleRetry}
              className="ml-2 text-xs underline underline-offset-2 hover:text-destructive"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-2">
        <div className="relative">
          <input
            ref={inputRef}
            id="ai-analyst-input"
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={status === 'loading'}
            placeholder="Ask about energy savings, water, waste…"
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60',
              status === 'error' ? 'border-destructive/50' : 'border-border',
            )}
          />
          <Button
            type="submit"
            disabled={!input.trim() || status === 'loading'}
            size="sm"
            className="absolute right-1 top-1"
          >
            {status === 'loading' ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="rounded-lg border border-chart-4/40 bg-chart-4/15 p-3 text-[10px] text-chart-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Not verified.</strong> AI
              suggestions are generated by a language model (NVIDIA NIM) and are
              not verified measurements or actual campus findings. Dashboard
              figures are simulated demonstration data. Consult a qualified
              energy professional before making changes.
            </span>
          </div>
        </div>
      </form>
    </Panel>
  )
}
