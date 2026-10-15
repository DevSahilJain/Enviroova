import { useId } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function Panel({
  title,
  description,
  actions,
  className,
  children,
}: PanelProps) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex min-w-0 flex-col rounded-xl border bg-card text-card-foreground shadow-xs',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 id={headingId} className="text-sm font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </header>
      <div className="flex-1 p-4 sm:p-5">{children}</div>
    </section>
  )
}
