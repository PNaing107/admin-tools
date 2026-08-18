import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CsvEditor } from '../components/CsvEditor'
import {
  downloadCsv,
  findMissingHeaders,
  getCsvHeaders,
  normalizeRows,
  parseCsv,
  type CsvData,
} from '../utils/csv'
import { defaultStartlistSettings, type StartlistSettings } from './startlistSettings'
import { StartlistSettingsForm } from './StartlistSettingsForm'
import './StartlistGenerator.css'

export const REQUIRED_STARTLIST_HEADERS = [
  'Ref',
  'First Name',
  'Last Name',
  'Category',
  'Please select the race category being entered. Only people who are female sex at birth are eligible to compete in the Female category. All individuals including transgender people are eligible to compete in the Open category.',
  'Time (mm:ss)',
] as const

export default function StartlistGenerator() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [settings, setSettings] = useState<StartlistSettings>(defaultStartlistSettings)
  const [data, setData] = useState<CsvData | null>(null)
  const [fileName, setFileName] = useState('export.csv')
  const [error, setError] = useState<string | null>(null)
  const [missingHeaders, setMissingHeaders] = useState<string[] | null>(null)

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setMissingHeaders(null)
    try {
      const text = await file.text()
      const parsed = normalizeRows(await parseCsv(text))
      const missing = findMissingHeaders(getCsvHeaders(parsed), REQUIRED_STARTLIST_HEADERS)
      if (missing.length > 0) {
        setMissingHeaders(missing)
        setData(null)
        return
      }
      setData(parsed)
      setFileName(file.name.endsWith('.csv') ? file.name : `${file.name}.csv`)
    } catch {
      setError('Could not parse this file. Please upload a valid CSV.')
      setData(null)
    } finally {
      event.target.value = ''
    }
  }, [])

  const handleDownload = useCallback(() => {
    if (data) downloadCsv(data, fileName)
  }, [data, fileName])

  const closeMissingHeadersModal = useCallback(() => setMissingHeaders(null), [])

  return (
    <div className="tool-page">
      <header className="tool-header">
        <div>
          <Link to="/" className="back-link">
            ← All tools
          </Link>
          <h1>Startlist Generator</h1>
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
          {data && (
            <button type="button" className="primary" onClick={handleDownload}>
              Download CSV
            </button>
          )}
        </div>
      </header>

      <main className="tool-main">
        <StartlistSettingsForm settings={settings} onChange={setSettings} />

        {error && <p className="error">{error}</p>}

        {!data && !error && (
          <div className="empty-state">
            <p>Upload a CSV file to get started.</p>
            <div className="empty-actions">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                Choose file
              </button>
            </div>
          </div>
        )}

        {data && (
          <CsvEditor
            data={data}
            onChange={setData}
            fileName={fileName}
            onFileNameChange={setFileName}
          />
        )}
      </main>

      {missingHeaders && (
        <AlertModal
          title="Missing required CSV headers"
          onClose={closeMissingHeadersModal}
        >
          <p>This file is missing the following required fields:</p>
          <ul className="missing-headers-list">
            {missingHeaders.map((header) => (
              <li key={header}>{header}</li>
            ))}
          </ul>
        </AlertModal>
      )}
    </div>
  )
}

function AlertModal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()

    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      className="alert-modal"
      aria-labelledby="alert-modal-title"
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close()
      }}
    >
      <h2 id="alert-modal-title">{title}</h2>
      {children}
      <form method="dialog">
        <button type="submit" className="alert-modal-ok">
          OK
        </button>
      </form>
    </dialog>
  )
}
