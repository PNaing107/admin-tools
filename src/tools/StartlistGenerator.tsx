import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CsvEditor } from '../components/CsvEditor'
import {
  countRowsByColumn,
  downloadCsv,
  findMissingHeaders,
  getCsvHeaders,
  normalizeRows,
  parseCsv,
  type ColumnCount,
  type CsvData,
} from '../utils/csv'
import {
  defaultStartlistSettings,
  getAverageEntrantsPerSlot,
  getRegistrationSlotDurationMinutes,
  type StartlistSettings,
} from './startlistSettings'
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
  const [uploadStats, setUploadStats] = useState<{ total: number; counts: ColumnCount[] } | null>(
    null,
  )

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setMissingHeaders(null)
    setUploadStats(null)
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
      setUploadStats(countRowsByColumn(parsed, 'Category'))
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
  const closeUploadStatsModal = useCallback(() => setUploadStats(null), [])

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
          variant="error"
          onClose={closeMissingHeadersModal}
        >
          <p>This file is missing the following required fields:</p>
          <ul className="modal-list">
            {missingHeaders.map((header) => (
              <li key={header}>{header}</li>
            ))}
          </ul>
        </AlertModal>
      )}

      {uploadStats && (
        <AlertModal
          title="CSV uploaded successfully"
          variant="success"
          onClose={closeUploadStatsModal}
        >
          <dl className="upload-stats">
            <div className="upload-stats-row">
              <dt>Total Number of Entrants</dt>
              <dd>{uploadStats.total}</dd>
            </div>
            <div className="upload-stats-row">
              <dt>Registration slot duration</dt>
              <dd>{formatSlotDuration(getRegistrationSlotDurationMinutes(settings))}</dd>
            </div>
            <div className="upload-stats-row">
              <dt>Average people per registration slot</dt>
              <dd>{getAverageEntrantsPerSlot(uploadStats.total, settings.registrationSlots) ?? '—'}</dd>
            </div>
          </dl>
          <h3 className="upload-stats-heading">Entrants per category</h3>
          {uploadStats.counts.length === 0 ? (
            <p>No entrant rows were found in this file.</p>
          ) : (
            <ul className="modal-list">
              {uploadStats.counts.map(({ value, count }) => (
                <li key={value}>
                  {value} - {count}
                </li>
              ))}
            </ul>
          )}
        </AlertModal>
      )}
    </div>
  )
}

function formatSlotDuration(minutes: number | null): string {
  if (minutes === null) return '—'
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}

function AlertModal({
  title,
  children,
  onClose,
  variant = 'error',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  variant?: 'error' | 'success'
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
      className={`alert-modal alert-modal--${variant}`}
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
