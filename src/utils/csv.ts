import Papa from 'papaparse'

export type CsvData = string[][]

export function parseCsv(text: string): Promise<CsvData> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(text, {
      complete: (results) => resolve(results.data),
      error: (error: Error) => reject(error),
      skipEmptyLines: true,
    })
  })
}

export function serializeCsv(data: CsvData): string {
  return Papa.unparse(data)
}

export function downloadCsv(data: CsvData, filename = 'export.csv'): void {
  const blob = new Blob([serializeCsv(data)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function normalizeRows(data: CsvData): CsvData {
  if (data.length === 0) return [['']]
  const maxCols = Math.max(...data.map((row) => row.length))
  return data.map((row) => {
    const padded = [...row]
    while (padded.length < maxCols) padded.push('')
    return padded
  })
}

/** First-row headers, with a UTF-8 BOM stripped from the first cell if present. */
export function getCsvHeaders(data: CsvData): string[] {
  const headers = data[0] ?? []
  if (headers.length === 0) return []
  return headers.map((header, index) => (index === 0 ? header.replace(/^\uFEFF/, '') : header))
}

export function findMissingHeaders(headers: string[], required: readonly string[]): string[] {
  const present = new Set(headers)
  return required.filter((header) => !present.has(header))
}

export interface ColumnCount {
  value: string
  count: number
}

export function countRowsByColumn(
  data: CsvData,
  columnName: string,
): { total: number; counts: ColumnCount[] } {
  const headers = getCsvHeaders(data)
  const colIndex = headers.indexOf(columnName)
  const rows = data.slice(1)
  const tally = new Map<string, number>()

  if (colIndex >= 0) {
    for (const row of rows) {
      const value = (row[colIndex] ?? '').trim() || '(blank)'
      tally.set(value, (tally.get(value) ?? 0) + 1)
    }
  }

  const counts = [...tally.entries()].map(([value, count]) => ({ value, count }))

  return { total: rows.length, counts }
}

/** Unique values in a column, in the order they first appear. */
export function getUniqueColumnValues(data: CsvData, columnName: string): string[] {
  const headers = getCsvHeaders(data)
  const colIndex = headers.indexOf(columnName)
  if (colIndex < 0) return []

  const seen = new Set<string>()
  const values: string[] = []
  for (const row of data.slice(1)) {
    const value = (row[colIndex] ?? '').trim() || '(blank)'
    if (!seen.has(value)) {
      seen.add(value)
      values.push(value)
    }
  }
  return values
}
