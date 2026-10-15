const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const formatKwh = (value: number) => `${number.format(value)} kWh`
export const formatNumber = (value: number) => number.format(value)
export const formatDecimal = (value: number) => decimal.format(value)

export function formatSigned(value: number, suffix = '') {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${decimal.format(Math.abs(value))}${suffix}`
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

export const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(iso))
}

export function formatDay(iso: string | number) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

export function formatTimeRange(startIso: string, endIso: string) {
  const end = new Date(new Date(endIso).getTime() + 3_600_000).toISOString()
  const time = (iso: string) =>
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(new Date(iso))
  return `${formatDateTime(startIso)} - ${time(end)} UTC`
}
