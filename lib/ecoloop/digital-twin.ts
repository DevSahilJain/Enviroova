/**
 * Campus Digital Twin Lite — building overlay data.
 *
 * Each building is pinned onto a satellite image by normalized coordinates
 * (0-100 for x and y within the image).  These coordinates are meant to be
 * eyeballed against the two Google Earth campus images:
 *   - public/images/campus-main.jpg   (main campus)
 *   - public/images/campus-hostel.jpg (hostel / residential zone)
 *
 * Adjust the x/y values until each pin lands on the right building.
 */

export type CampusZone = 'main' | 'hostel'

export interface CampusBuilding {
  id: string
  name: string
  /** Optional subtitle shown in the building detail card. */
  description?: string
  zone: CampusZone
  /** Normalized x position 0-100 across the image width */
  x: number
  /** Normalized y position 0-100 across the image height */
  y: number
  category: string
  /** Current kW draw, for the overlay badge */
  currentKw: number
  /** Baseline kW draw */
  baselineKw: number
  /** Current water usage, litres/day */
  currentWaterLpd?: number
  /** Baseline water usage, litres/day */
  baselineWaterLpd?: number
  /** Current waste generation, kg/day */
  currentWasteKgpd?: number
  /** Baseline waste generation, kg/day */
  baselineWasteKgpd?: number
  /** Short status label */
  status: 'Normal' | 'Elevated' | 'Critical Anomaly'
}

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  {
    id: 'science-complex',
    name: 'S Residences T3',
    zone: 'hostel',
    x: 32,
    y: 40,
    category: 'Academic',
    currentKw: 284.5,
    baselineKw: 215.0,
    currentWaterLpd: 450,
    baselineWaterLpd: 320,
    currentWasteKgpd: 24.5,
    baselineWasteKgpd: 18.0,
    status: 'Critical Anomaly',
  },
  {
    id: 'student-library',
    name: 'Area Under DSU College of Nursing Science',
    zone: 'hostel',
    x: 58,
    y: 62,
    category: 'Library',
    currentKw: 172.0,
    baselineKw: 110.0,
    currentWaterLpd: 280,
    baselineWaterLpd: 200,
    currentWasteKgpd: 15.2,
    baselineWasteKgpd: 12.0,
    status: 'Critical Anomaly',
  },
  {
    id: 'engineering-annex',
    name: 'Mortuary',
    zone: 'hostel',
    x: 72,
    y: 28,
    category: 'Academic',
    currentKw: 138.2,
    baselineKw: 125.0,
    currentWaterLpd: 120,
    baselineWaterLpd: 110,
    currentWasteKgpd: 8.5,
    baselineWasteKgpd: 7.0,
    status: 'Elevated',
  },
  {
    id: 'central-dining',
    name: 'Lake Side',
    zone: 'hostel',
    x: 45,
    y: 78,
    category: 'Dining',
    currentKw: 104.0,
    baselineKw: 98.0,
    currentWaterLpd: 680,
    baselineWaterLpd: 600,
    currentWasteKgpd: 42.0,
    baselineWasteKgpd: 35.0,
    status: 'Normal',
  },
  {
    id: 'north-dorms',
    name: 'Heart of DSU Campus',
    description: 'School of Engineering and CDSIMER area',
    zone: 'main',
    x: 40,
    y: 45,
    category: 'Residential',
    currentKw: 145.8,
    baselineKw: 140.0,
    currentWaterLpd: 520,
    baselineWaterLpd: 480,
    currentWasteKgpd: 28.0,
    baselineWasteKgpd: 25.0,
    status: 'Normal',
  },
  {
    id: 'sports-arena',
    name: 'S Residences T1 and T2',
    zone: 'hostel',
    x: 22,
    y: 72,
    category: 'Recreation',
    currentKw: 92.4,
    baselineKw: 88.0,
    currentWaterLpd: 310,
    baselineWaterLpd: 290,
    currentWasteKgpd: 16.5,
    baselineWasteKgpd: 14.0,
    status: 'Normal',
  },
]

export const ZONE_CONFIG: Record<CampusZone, { src: string; title: string; subtitle: string }> = {
  main: {
    src: '/images/campus-hostel.jpg',
    title: 'Main Campus',
    subtitle: 'Academic, dining and recreation buildings',
  },
  hostel: {
    src: '/images/campus-main.jpg',
    title: 'Residential Zone',
    subtitle: 'Hostel and residential halls',
  },
}

export function statusTone(status: CampusBuilding['status']): string {
  switch (status) {
    case 'Critical Anomaly':
      return 'bg-chart-5/20 text-chart-5 border-chart-5/40'
    case 'Elevated':
      return 'bg-chart-4/20 text-chart-4 border-chart-4/40'
    default:
      return 'bg-primary/15 text-primary border-primary/30'
  }
}