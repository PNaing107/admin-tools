import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { CsvEditor } from './components/CsvEditor'
import { downloadCsv, normalizeRows, parseCsv, type CsvData } from './utils/csv'
import './App.css'

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<CsvData | null>(null)
  const [fileName, setFileName] = useState('export.csv')
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    try {
      const text = await file.text()
      const parsed = normalizeRows(await parseCsv(text))
      setData(parsed)
      setFileName(file.name.endsWith('.csv') ? file.name : `${file.name}.csv`)
    } catch {
      setError('Could not parse this file. Please upload a valid CSV.')
      setData(null)
    } finally {
      event.target.value = ''
    }
  }, [])

  const handleNew = useCallback(() => {
    setError(null)
    setData([['Column 1', 'Column 2', 'Column 3']])
    setFileName('new.csv')
  }, [])

  const handleDownload = useCallback(() => {
    if (data) downloadCsv(data, fileName)
  }, [data, fileName])

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>CSV Editor</h1>
          <p className="subtitle">Upload, edit, and download CSV files — entirely in your browser.</p>
        </div>
        <div className="toolbar">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            hidden
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Upload CSV
          </button>
          <button type="button" className="secondary" onClick={handleNew}>
            New sheet
          </button>
          {data && (
            <button type="button" className="primary" onClick={handleDownload}>
              Download CSV
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {error && <p className="error">{error}</p>}

        {!data && !error && (
          <div className="empty-state">
            <p>Upload a CSV file or start with a blank sheet.</p>
            <div className="empty-actions">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                Choose file
              </button>
              <button type="button" className="secondary" onClick={handleNew}>
                Start blank
              </button>
            </div>
          </div>
        )}

        {data && <CsvEditor data={data} onChange={setData} fileName={fileName} onFileNameChange={setFileName} />}
      </main>
    </div>
  )
}

export default App
