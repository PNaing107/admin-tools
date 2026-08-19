import {
  getCsvHeaders,
  keepColumns,
  type CsvData,
} from '../utils/csv'
import { defaultSeedingOrder, type AgeCategory, type AthleteSeedingOrder } from './startlistSettings'

const CATEGORY_COLUMN = 'Category'
const FIRST_NAME_COLUMN = 'First Name'
const LAST_NAME_COLUMN = 'Last Name'
const TIME_COLUMN = 'Time (mm:ss)'
const FULL_NAME_COLUMN = 'Full Name'

/** Parses a `mm:ss` swim time into total seconds. Returns null when the value is not a valid time. */
export function parseSwimTimeToSeconds(time: string): number | null {
  const match = /^(\d+):([0-5]?\d)$/.exec(time.trim())
  if (!match) return null

  const minutes = Number(match[1])
  const seconds = Number(match[2])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null

  return minutes * 60 + seconds
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

export function buildStartlistCsv(
  data: CsvData,
  requiredColumns: readonly string[],
  categoryOrder: string[],
  seedingOrders: Record<string, AthleteSeedingOrder>,
): CsvData {
  const kept = keepColumns(data, requiredColumns)
  const withFullName = addFullNameColumn(kept)
  return sortStartlistRows(withFullName, categoryOrder, seedingOrders)
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
