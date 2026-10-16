const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('en-IN', {
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
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

export const formatCurrencyDecimal = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)

export const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso))
}

export function formatDay(iso: string | number) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso))
}

export function formatTimeRange(startIso: string, endIso: string) {
  const end = new Date(new Date(endIso).getTime() + 3_600_000).toISOString()
  const time = (iso: string) =>
    new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
  return `${formatDateTime(startIso)} - ${time(end)} IST`
}

export function getISTHour(iso: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      timeZone: 'Asia/Kolkata',
      hour12: false,
    }).format(new Date(iso)),
    10,
  )
}

export function getISTDay(ms: number): number {
  const istDate = new Date(ms + 5.5 * 3_600_000)
  return istDate.getUTCDay()
}
