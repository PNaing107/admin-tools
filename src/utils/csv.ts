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
