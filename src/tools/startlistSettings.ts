export type AgeCategory = 'Senior' | 'Junior'
export type AthleteSeedingOrder = 'fastest-to-slowest' | 'slowest-to-fastest'

export const SEEDING_ORDER_OPTIONS: { value: AthleteSeedingOrder; label: string }[] = [
  { value: 'fastest-to-slowest', label: 'Fastest to Slowest' },
  { value: 'slowest-to-fastest', label: 'Slowest to Fastest' },
]

export const defaultSeedingOrder: AthleteSeedingOrder = 'fastest-to-slowest'

export interface StartlistSettings {
  ageCategory: AgeCategory
  registrationStartTime: string
  registrationEndTime: string
  registrationSlots: number
  swimLanes: number
  swimmersPerLane: number
  swimStartTime: string
  averageSwimTimeInMinutes: number
  bikesPerRack: number
}

export const defaultStartlistSettings: StartlistSettings = {
  ageCategory: 'Senior',
  registrationStartTime: '',
  registrationEndTime: '',
  registrationSlots: 1,
  swimLanes: 1,
  swimmersPerLane: 2,
  swimStartTime: '',
  averageSwimTimeInMinutes: 9,
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

/** Bike racks needed, always rounded up. */
export function getBikeRacksNeeded(totalEntrants: number, bikesPerRack: number): number | null {
  if (bikesPerRack <= 0) return null
  return Math.ceil(totalEntrants / bikesPerRack)
}
