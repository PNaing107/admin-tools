import {
  getCsvHeaders,
  keepColumns,
  type ColumnCount,
  type CsvData,
} from '../utils/csv'
import {
  defaultSeedingOrder,
  formatMinutesAsClock,
  getJuniorRaceCategory,
  getRegistrationSlotWindows,
  getSwimmersInPoolAtOnce,
  JUNIOR_RACE_CATEGORIES,
  parseTimeToMinutes,
  type AgeCategory,
  type AthleteSeedingOrder,
  type StartlistSettings,
} from './startlistSettings'

const CATEGORY_COLUMN = 'Category'
const FIRST_NAME_COLUMN = 'First Name'
const LAST_NAME_COLUMN = 'Last Name'
const TIME_COLUMN = 'Time (mm:ss)'
const DATE_OF_BIRTH_COLUMN = 'Date Of Birth'
const FULL_NAME_COLUMN = 'Full Name'
const AGE_AT_END_OF_YEAR_COLUMN = 'Age at End of Year'
const REGISTRATION_SLOT_COLUMN = 'Registration Slot'
const RACE_START_TIME_COLUMN = 'Race Start Time'
const RACKING_NUMBER_COLUMN = 'Racking Number'
const RACE_NUMBER_COLUMN = 'Race Number'

function normalizeTimeCell(time: string): string {
  return time
    .replace(/^\uFEFF/, '')
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .trim()
    .replace(/^["'=]+/, '')
    .replace(/["']+$/, '')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s+(a\.?m\.?|p\.?m\.?)$/i, '')
    .trim()
}

/**
 * Parses a predicted swim time into total seconds.
 * Accepts `mm:ss`, `m:ss`, `hh:mm:ss`, fractional seconds, AM/PM,
 * and Excel/Google Sheets duration exports such as `00:08:45` or `12/30/1899 0:08:45`.
 */
export function parseSwimTimeToSeconds(time: string): number | null {
  const value = normalizeTimeCell(time)
  if (!value) return null

  if (/^0?\.\d+$/.test(value)) {
    const fraction = Number(value)
    if (Number.isFinite(fraction) && fraction > 0 && fraction < 1) {
      return Math.round(fraction * 24 * 60 * 60)
    }
  }

  const match = /(\d{1,3}):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?/.exec(value)
  if (!match) return null

  const first = Number(match[1])
  const second = Number(match[2])
  const third = match[3] == null ? null : Number(match[3])
  if (![first, second, third].every((part) => part == null || Number.isFinite(part))) return null

  if (third == null) {
    if (second >= 60) return null
    return first * 60 + second
  }

  if (second >= 60 || third >= 60) return null
  // Duration exports use 00:mm:ss; Sheets/Excel clock times use mm:ss:00.
  if (first === 0) return second * 60 + third
  if (third === 0) return first * 60 + second
  return first * 3600 + second * 60 + third
}

export function addFullNameColumn(data: CsvData): CsvData {
  const headers = getCsvHeaders(data)
  const firstNameIndex = headers.indexOf(FIRST_NAME_COLUMN)
  const lastNameIndex = headers.indexOf(LAST_NAME_COLUMN)

  return data.map((row, rowIndex) => {
    if (rowIndex === 0) return [...row, FULL_NAME_COLUMN]
    const firstName = row[firstNameIndex] ?? ''
    const lastName = row[lastNameIndex] ?? ''
    return [...row, `${firstName} ${lastName}`]
  })
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/** Parses a date of birth. Prefers ISO `YYYY-MM-DD`, then UK `DD/MM/YYYY`. */
export function parseDateOfBirth(value: string): { year: number; month: number; day: number } | null {
  const trimmed = value.trim().replace(/^\uFEFF/, '').replace(/^["']+|["']+$/g, '')
  if (!trimmed) return null

  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(trimmed)
  if (iso) {
    const year = Number(iso[1])
    const month = Number(iso[2])
    const day = Number(iso[3])
    if (isValidYmd(year, month, day)) return { year, month, day }
  }

  const uk = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/.exec(trimmed)
  if (uk) {
    const day = Number(uk[1])
    const month = Number(uk[2])
    const year = Number(uk[3])
    if (isValidYmd(year, month, day)) return { year, month, day }
  }

  const serial = Number(trimmed)
  if (Number.isInteger(serial) && serial > 200 && serial < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
    return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() }
  }

  return null
}

/** Age the athlete will be on 31 December of `year`. */
export function ageAtEndOfYear(dateOfBirth: string, year: number): number | null {
  const parsed = parseDateOfBirth(dateOfBirth)
  if (!parsed) return null
  return year - parsed.year
}

export function addAgeAtEndOfYearColumn(data: CsvData, year = new Date().getFullYear()): CsvData {
  const headers = getCsvHeaders(data)
  const dobIndex = headers.indexOf(DATE_OF_BIRTH_COLUMN)
  const insertAt = dobIndex >= 0 ? dobIndex + 1 : headers.length

  return data.map((row, rowIndex) => {
    const next = [...row]
    const value =
      rowIndex === 0
        ? AGE_AT_END_OF_YEAR_COLUMN
        : dobIndex < 0
          ? ''
          : String(ageAtEndOfYear(row[dobIndex] ?? '', year) ?? '')
    next.splice(insertAt, 0, value)
    return next
  })
}

export function assignJuniorRaceCategories(data: CsvData): CsvData {
  const headers = getCsvHeaders(data)
  const categoryIndex = headers.indexOf(CATEGORY_COLUMN)
  const ageIndex = headers.indexOf(AGE_AT_END_OF_YEAR_COLUMN)
  if (categoryIndex < 0 || ageIndex < 0) return data

  return data.map((row, rowIndex) => {
    if (rowIndex === 0) return row
    const rawAge = (row[ageIndex] ?? '').trim()
    if (!rawAge) return row
    const age = Number(rawAge)
    const juniorCategory = Number.isInteger(age) ? getJuniorRaceCategory(age) : null
    if (!juniorCategory) return row
    return row.map((cell, index) => (index === categoryIndex ? juniorCategory : cell))
  })
}

export function countJuniorAthletesByRaceCategory(
  data: CsvData,
  year = new Date().getFullYear(),
): ColumnCount[] {
  const headers = getCsvHeaders(data)
  const dobIndex = headers.indexOf(DATE_OF_BIRTH_COLUMN)
  const tally = new Map<string, number>(JUNIOR_RACE_CATEGORIES.map((category) => [category, 0]))

  if (dobIndex >= 0) {
    for (const row of data.slice(1)) {
      const age = ageAtEndOfYear(row[dobIndex] ?? '', year)
      if (age === null) continue
      const category = getJuniorRaceCategory(age)
      if (!category) continue
      tally.set(category, (tally.get(category) ?? 0) + 1)
    }
  }

  return JUNIOR_RACE_CATEGORIES.map((value) => ({ value, count: tally.get(value) ?? 0 }))
}

function categoryValue(row: string[], categoryIndex: number): string {
  return (row[categoryIndex] ?? '').trim() || '(blank)'
}

export function sortStartlistRows(
  data: CsvData,
  categoryOrder: string[],
  seedingOrders: Record<string, AthleteSeedingOrder>,
): CsvData {
  const headers = getCsvHeaders(data)
  const categoryIndex = headers.indexOf(CATEGORY_COLUMN)
  const timeIndex = headers.indexOf(TIME_COLUMN)
  const headerRow = data[0] ?? []
  const categoryRank = new Map(categoryOrder.map((category, index) => [category, index]))

  const sortedRows = data.slice(1).sort((a, b) => {
    const categoryA = categoryValue(a, categoryIndex)
    const categoryB = categoryValue(b, categoryIndex)
    const rankA = categoryRank.get(categoryA) ?? Number.MAX_SAFE_INTEGER
    const rankB = categoryRank.get(categoryB) ?? Number.MAX_SAFE_INTEGER
    if (rankA !== rankB) return rankA - rankB

    const timeA = parseSwimTimeToSeconds(a[timeIndex] ?? '')
    const timeB = parseSwimTimeToSeconds(b[timeIndex] ?? '')
    if (timeA === null && timeB === null) return 0
    if (timeA === null) return 1
    if (timeB === null) return -1

    const order = seedingOrders[categoryA] ?? defaultSeedingOrder
    return order === 'fastest-to-slowest' ? timeA - timeB : timeB - timeA
  })

  return [headerRow, ...sortedRows]
}

function assignEvenlyToSlots(count: number, windows: string[]): string[] {
  if (count === 0 || windows.length === 0) return Array(count).fill('')
  const base = Math.floor(count / windows.length)
  const remainder = count % windows.length
  const assigned: string[] = []
  for (let slot = 0; slot < windows.length; slot++) {
    const size = base + (slot < remainder ? 1 : 0)
    for (let i = 0; i < size; i++) assigned.push(windows[slot])
  }
  return assigned
}

export function addRegistrationSlotColumn(data: CsvData, settings: StartlistSettings): CsvData {
  const windows = getRegistrationSlotWindows(settings)
  const headerRow = [...(data[0] ?? []), REGISTRATION_SLOT_COLUMN]
  const rows = data.slice(1)
  const slots = windows ? assignEvenlyToSlots(rows.length, windows) : rows.map(() => '')
  return [headerRow, ...rows.map((row, index) => [...row, slots[index] ?? ''])]
}

function groupConsecutiveCategoryIndices(rows: string[][], categoryIndex: number): number[][] {
  const groups: number[][] = []
  for (let i = 0; i < rows.length; i++) {
    const category = categoryValue(rows[i], categoryIndex)
    const current = groups[groups.length - 1]
    const previousCategory =
      current && current.length > 0 ? categoryValue(rows[current[0]], categoryIndex) : null
    if (current && previousCategory === category) {
      current.push(i)
    } else {
      groups.push([i])
    }
  }
  return groups
}

export function addRaceStartTimeColumn(data: CsvData, settings: StartlistSettings): CsvData {
  const headerRow = [...(data[0] ?? []), RACE_START_TIME_COLUMN]
  const rows = data.slice(1)
  const times = assignRaceStartTimes(rows, getCsvHeaders(data).indexOf(CATEGORY_COLUMN), settings)
  return [headerRow, ...rows.map((row, index) => [...row, times[index] ?? ''])]
}

export function assignRaceStartTimes(
  rows: string[][],
  categoryIndex: number,
  settings: StartlistSettings,
): string[] {
  const times = rows.map(() => '')
  const capacity = getSwimmersInPoolAtOnce(settings)
  const swimStart = parseTimeToMinutes(settings.swimStartTime)
  if (capacity === null || swimStart === null || settings.averageSwimTimeInMinutes < 0) {
    return times
  }

  let lastWaveStart: number | null = null
  for (const indices of groupConsecutiveCategoryIndices(rows, categoryIndex)) {
    const delayToNextCategory = Math.max(
      settings.gapBetweenRaceCategoriesInMinutes,
      settings.averageSwimTimeInMinutes,
    )
    const categoryStart: number =
      lastWaveStart === null ? swimStart : lastWaveStart + delayToNextCategory

    for (let i = 0; i < indices.length; i++) {
      const waveStart: number =
        categoryStart + Math.floor(i / capacity) * settings.averageSwimTimeInMinutes
      times[indices[i]] = formatMinutesAsClock(waveStart)
      lastWaveStart = waveStart
    }
  }

  return times
}

export function addRackingNumberColumn(data: CsvData, settings: StartlistSettings): CsvData {
  const headerRow = [...(data[0] ?? []), RACKING_NUMBER_COLUMN]
  const rows = data.slice(1)
  const bikesPerRack = settings.bikesPerRack
  const numbers =
    bikesPerRack > 0
      ? rows.map((_, index) => String(Math.floor(index / bikesPerRack) + 1))
      : rows.map(() => '')
  return [headerRow, ...rows.map((row, index) => [...row, numbers[index] ?? ''])]
}

export function parseOutOfSequenceBibs(value: string): number[] {
  const bibs: number[] = []
  for (const part of value.split(',')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const parsed = Number(trimmed)
    if (Number.isInteger(parsed) && parsed >= 0) bibs.push(parsed)
  }
  return bibs
}

export function assignRaceNumbers(
  rows: string[][],
  categoryIndex: number,
  outOfSequenceBibs: Record<string, string>,
  firstRegularBibs: Record<string, number | ''>,
): string[] {
  const numbers = rows.map(() => '')

  for (const indices of groupConsecutiveCategoryIndices(rows, categoryIndex)) {
    const category = categoryValue(rows[indices[0]], categoryIndex)
    const reserved = parseOutOfSequenceBibs(outOfSequenceBibs[category] ?? '')
    const firstRegular = firstRegularBibs[category]
    let nextRegular: number | null = typeof firstRegular === 'number' ? firstRegular : null

    for (let i = 0; i < indices.length; i++) {
      if (i < reserved.length) {
        numbers[indices[i]] = String(reserved[i])
        continue
      }
      if (nextRegular === null) continue
      numbers[indices[i]] = String(nextRegular)
      nextRegular += 1
    }
  }

  return numbers
}

export function addRaceNumberColumn(
  data: CsvData,
  outOfSequenceBibs: Record<string, string>,
  firstRegularBibs: Record<string, number | ''>,
): CsvData {
  const headerRow = [...(data[0] ?? []), RACE_NUMBER_COLUMN]
  const rows = data.slice(1)
  const numbers = assignRaceNumbers(
    rows,
    getCsvHeaders(data).indexOf(CATEGORY_COLUMN),
    outOfSequenceBibs,
    firstRegularBibs,
  )
  return [headerRow, ...rows.map((row, index) => [...row, numbers[index] ?? ''])]
}

export function buildStartlistCsv(
  data: CsvData,
  requiredColumns: readonly string[],
  categoryOrder: string[],
  seedingOrders: Record<string, AthleteSeedingOrder>,
  settings: StartlistSettings,
  outOfSequenceBibs: Record<string, string>,
  firstRegularBibs: Record<string, number | ''>,
): CsvData {
  const kept = keepColumns(data, requiredColumns)
  const withFullName = addFullNameColumn(kept)
  const withJuniorFields =
    settings.ageCategory === 'Junior'
      ? assignJuniorRaceCategories(addAgeAtEndOfYearColumn(withFullName))
      : withFullName
  const sorted = sortStartlistRows(withJuniorFields, categoryOrder, seedingOrders)
  const withSlots = addRegistrationSlotColumn(sorted, settings)
  const withStartTimes = addRaceStartTimeColumn(withSlots, settings)
  const withRacks = addRackingNumberColumn(withStartTimes, settings)
  return addRaceNumberColumn(withRacks, outOfSequenceBibs, firstRegularBibs)
}

export function formatStartlistTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

export function startlistDownloadFilename(
  originalFileName: string,
  ageCategory: AgeCategory,
  date = new Date(),
): string {
  const baseName = originalFileName.replace(/\.csv$/i, '')
  return `${baseName}_${ageCategory}_${formatStartlistTimestamp(date)}.csv`
}
