export type AgeCategory = 'Senior' | 'Junior'
export type AthleteSeedingOrder = 'fastest-to-slowest' | 'slowest-to-fastest'

export const SEEDING_ORDER_OPTIONS: { value: AthleteSeedingOrder; label: string }[] = [
  { value: 'fastest-to-slowest', label: 'Fastest to Slowest' },
  { value: 'slowest-to-fastest', label: 'Slowest to Fastest' },
]

export const defaultSeedingOrder: AthleteSeedingOrder = 'fastest-to-slowest'

export const JUNIOR_RACE_CATEGORIES = [
  'Micro Category',
  'Mini 8',
  'Mini 9 - 10',
  'Mini 11 - 12',
  'Mini 13 - 14',
  'Mini 15 - 16',
] as const

export type JuniorRaceCategory = (typeof JUNIOR_RACE_CATEGORIES)[number]

/** Maps age at end of year to the Junior race category, or null if outside Mini/Micro bands. */
export function getJuniorRaceCategory(ageAtEndOfYear: number): JuniorRaceCategory | null {
  if (!Number.isFinite(ageAtEndOfYear) || ageAtEndOfYear < 0) return null
  if (ageAtEndOfYear < 8) return 'Micro Category'
  if (ageAtEndOfYear === 8) return 'Mini 8'
  if (ageAtEndOfYear <= 10) return 'Mini 9 - 10'
  if (ageAtEndOfYear <= 12) return 'Mini 11 - 12'
  if (ageAtEndOfYear <= 14) return 'Mini 13 - 14'
  if (ageAtEndOfYear <= 16) return 'Mini 15 - 16'
  return null
}

export interface StartlistSettings {
  ageCategory: AgeCategory
  registrationStartTime: string
  registrationEndTime: string
  registrationSlots: number
  swimLanes: number
  swimmersPerLane: number
  swimStartTime: string
  averageSwimTimeInMinutes: number
  gapBetweenRaceCategoriesInMinutes: number
  bikesPerRack: number
}

export const defaultStartlistSettings: StartlistSettings = {
  ageCategory: 'Senior',
  registrationStartTime: '06:30',
  registrationEndTime: '07:45',
  registrationSlots: 5,
  swimLanes: 4,
  swimmersPerLane: 2,
  swimStartTime: '08:00',
  averageSwimTimeInMinutes: 9,
  gapBetweenRaceCategoriesInMinutes: 10,
  bikesPerRack: 5,
}

/** Parses an `HH:MM` or `HH:MM:SS` time string into minutes from midnight. */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] ?? 0)
  if (hours > 23 || minutes > 59 || seconds > 59) return null

  return hours * 60 + minutes + seconds / 60
}

/** Formats minutes from midnight as a padded `HH:MM` clock time. */
export function formatMinutesAsClock(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes)
  const wrapped = ((rounded % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(wrapped / 60)
  const minutes = wrapped % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Registration slot windows from opening time to closing time, e.g. `06:30 - 06:45`.
 * Uses the same slot duration as the upload-stats modal. The final window always ends at closing time.
 */
export function getRegistrationSlotWindows(settings: StartlistSettings): string[] | null {
  const start = parseTimeToMinutes(settings.registrationStartTime)
  const end = parseTimeToMinutes(settings.registrationEndTime)
  const duration = getRegistrationSlotDurationMinutes(settings)
  if (start === null || end === null || duration === null || settings.registrationSlots <= 0) {
    return null
  }

  const windows: string[] = []
  for (let i = 0; i < settings.registrationSlots; i++) {
    const slotStart = start + i * duration
    const slotEnd = i === settings.registrationSlots - 1 ? end : start + (i + 1) * duration
    windows.push(`${formatMinutesAsClock(slotStart)} - ${formatMinutesAsClock(slotEnd)}`)
  }
  return windows
}

/**
 * Duration of each registration slot in minutes:
 * (registrationEndTime - registrationStartTime) / registrationSlots, rounded to the nearest minute.
 * Returns null when times are missing or the window is not positive.
 */
export function getRegistrationSlotDurationMinutes(settings: StartlistSettings): number | null {
  const start = parseTimeToMinutes(settings.registrationStartTime)
  const end = parseTimeToMinutes(settings.registrationEndTime)
  if (start === null || end === null || settings.registrationSlots <= 0) return null

  const duration = (end - start) / settings.registrationSlots
  if (!Number.isFinite(duration) || duration < 0) return null

  return Math.round(duration)
}

/** Average people per registration slot, always rounded up. */
export function getAverageEntrantsPerSlot(
  totalEntrants: number,
  registrationSlots: number,
): number | null {
  if (registrationSlots <= 0) return null
  return Math.ceil(totalEntrants / registrationSlots)
}

/** How many swimmers can be in the pool at once. */
export function getSwimmersInPoolAtOnce(settings: StartlistSettings): number | null {
  if (settings.swimLanes <= 0 || settings.swimmersPerLane <= 0) return null
  return settings.swimLanes * settings.swimmersPerLane
}

/** Bike racks needed, always rounded up. */
export function getBikeRacksNeeded(totalEntrants: number, bikesPerRack: number): number | null {
  if (bikesPerRack <= 0) return null
  return Math.ceil(totalEntrants / bikesPerRack)
}
