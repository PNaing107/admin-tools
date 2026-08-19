import {
  getCsvHeaders,
  keepColumns,
  type CsvData,
} from '../utils/csv'
import {
  defaultSeedingOrder,
  formatMinutesAsClock,
  getRegistrationSlotWindows,
  getSwimmersInPoolAtOnce,
  parseTimeToMinutes,
  type AgeCategory,
  type AthleteSeedingOrder,
  type StartlistSettings,
} from './startlistSettings'

const CATEGORY_COLUMN = 'Category'
const FIRST_NAME_COLUMN = 'First Name'
const LAST_NAME_COLUMN = 'Last Name'
const TIME_COLUMN = 'Time (mm:ss)'
const FULL_NAME_COLUMN = 'Full Name'
const REGISTRATION_SLOT_COLUMN = 'Registration Slot'
const RACE_START_TIME_COLUMN = 'Race Start Time'

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
    const categoryStart =
      lastWaveStart === null ? swimStart : lastWaveStart + delayToNextCategory

    for (let i = 0; i < indices.length; i++) {
      const waveStart = categoryStart + Math.floor(i / capacity) * settings.averageSwimTimeInMinutes
      times[indices[i]] = formatMinutesAsClock(waveStart)
      lastWaveStart = waveStart
    }
  }

  return times
}

export function buildStartlistCsv(
  data: CsvData,
  requiredColumns: readonly string[],
  categoryOrder: string[],
  seedingOrders: Record<string, AthleteSeedingOrder>,
  settings: StartlistSettings,
): CsvData {
  const kept = keepColumns(data, requiredColumns)
  const withFullName = addFullNameColumn(kept)
  const sorted = sortStartlistRows(withFullName, categoryOrder, seedingOrders)
  const withSlots = addRegistrationSlotColumn(sorted, settings)
  return addRaceStartTimeColumn(withSlots, settings)
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
