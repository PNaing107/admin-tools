import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CsvEditor } from '../components/CsvEditor'
import {
  countRowsByColumn,
  downloadCsv,
  findMissingHeaders,
  getCsvHeaders,
  getUniqueColumnValues,
  normalizeRows,
  parseCsv,
  type ColumnCount,
  type CsvData,
} from '../utils/csv'
import { buildStartlistCsv, startlistDownloadFilename } from './generateStartlist'
import {
  defaultSeedingOrder,
  defaultStartlistSettings,
  getAverageEntrantsPerSlot,
  getBikeRacksNeeded,
  getRegistrationSlotDurationMinutes,
  SEEDING_ORDER_OPTIONS,
  type AthleteSeedingOrder,
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
  const [csvValidated, setCsvValidated] = useState(false)
  const [showSeedingModal, setShowSeedingModal] = useState(false)
  const [raceCategories, setRaceCategories] = useState<string[]>([])
  const [seedingOrders, setSeedingOrders] = useState<Record<string, AthleteSeedingOrder>>({})
  const [outOfSequenceBibs, setOutOfSequenceBibs] = useState<Record<string, string>>({})
  const [firstRegularBibs, setFirstRegularBibs] = useState<Record<string, number | ''>>({})

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setMissingHeaders(null)
    setUploadStats(null)
    setCsvValidated(false)
    setShowSeedingModal(false)
    setRaceCategories([])
    setSeedingOrders({})
    setOutOfSequenceBibs({})
    setFirstRegularBibs({})
    try {
      const text = await file.text()
      const parsed = normalizeRows(await parseCsv(text))
      const missing = findMissingHeaders(getCsvHeaders(parsed), REQUIRED_STARTLIST_HEADERS)
      if (missing.length > 0) {
        setMissingHeaders(missing)
        setData(null)
        return
      }
      const stats = countRowsByColumn(parsed, 'Category')
      const categories = getUniqueColumnValues(parsed, 'Category')
      setData(parsed)
      setFileName(file.name.endsWith('.csv') ? file.name : `${file.name}.csv`)
      setUploadStats(stats)
      setRaceCategories(categories)
      setSeedingOrders(
        Object.fromEntries(categories.map((category) => [category, defaultSeedingOrder])),
      )
      setOutOfSequenceBibs(Object.fromEntries(categories.map((category) => [category, ''])))
      setFirstRegularBibs(Object.fromEntries(categories.map((category) => [category, ''])))
      setCsvValidated(true)
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

  const handleGenerateStartlist = useCallback(() => {
    if (!data) return
    const processed = buildStartlistCsv(
      data,
      REQUIRED_STARTLIST_HEADERS,
      raceCategories,
      seedingOrders,
      settings,
    )
    downloadCsv(processed, startlistDownloadFilename(fileName, settings.ageCategory))
  }, [data, fileName, raceCategories, seedingOrders, settings])

  const closeMissingHeadersModal = useCallback(() => setMissingHeaders(null), [])
  const closeUploadStatsModal = useCallback(() => setUploadStats(null), [])
  const closeSeedingModal = useCallback(() => setShowSeedingModal(false), [])

  const updateSeedingOrder = useCallback((category: string, order: AthleteSeedingOrder) => {
    setSeedingOrders((current) => ({ ...current, [category]: order }))
  }, [])

  const updateOutOfSequenceBibs = useCallback((category: string, value: string) => {
    setOutOfSequenceBibs((current) => ({ ...current, [category]: value }))
  }, [])

  const updateFirstRegularBib = useCallback((category: string, value: string) => {
    if (value === '') {
      setFirstRegularBibs((current) => ({ ...current, [category]: '' }))
      return
    }
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed >= 0) {
      setFirstRegularBibs((current) => ({ ...current, [category]: parsed }))
    }
  }, [])

  const moveCategory = useCallback((index: number, direction: -1 | 1) => {
    setRaceCategories((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const reordered = [...current]
      const [moved] = reordered.splice(index, 1)
      reordered.splice(nextIndex, 0, moved)
      return reordered
    })
  }, [])

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
            <button type="button" onClick={handleDownload}>
              Download CSV
            </button>
          )}
        </div>
      </header>

      <main className="tool-main">
        <StartlistSettingsForm settings={settings} onChange={setSettings} />

        {data && csvValidated && !uploadStats && (
          <div className="generate-actions">
            <button type="button" className="primary" onClick={() => setShowSeedingModal(true)}>
              Generate Startlist
            </button>
          </div>
        )}

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
            <div className="upload-stats-row">
              <dt>Bike racks needed</dt>
              <dd>{getBikeRacksNeeded(uploadStats.total, settings.bikesPerRack) ?? '—'}</dd>
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

      {showSeedingModal && (
        <AlertModal
          title="Generate Startlist"
          variant="default"
          wide
          onClose={closeSeedingModal}
          onConfirm={handleGenerateStartlist}
        >
          <form
            className="seeding-form"
            onSubmit={(event) => {
              event.preventDefault()
              handleGenerateStartlist()
              closeSeedingModal()
            }}
          >
            <p className="seeding-hint">
              Use the arrows to set the order races start. This can differ from the order
              categories appear in the CSV.
            </p>
            <table className="seeding-table">
              <thead>
                <tr>
                  <th>Start order</th>
                  <th>Race Category</th>
                  <th>Athlete Seeding Order</th>
                  <th>Out of Sequence Bib Numbers</th>
                  <th>First Regular Sequence Bib Number</th>
                </tr>
              </thead>
              <tbody>
                {raceCategories.map((category, index) => (
                  <tr key={category}>
                    <td className="seeding-order-cell">
                      <span className="seeding-order-number">{index + 1}</span>
                      <div className="seeding-order-buttons">
                        <button
                          type="button"
                          className="seeding-move-btn"
                          onClick={() => moveCategory(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${category} earlier in the start order`}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="seeding-move-btn"
                          onClick={() => moveCategory(index, 1)}
                          disabled={index === raceCategories.length - 1}
                          aria-label={`Move ${category} later in the start order`}
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td>{category}</td>
                    <td>
                      <select
                        value={seedingOrders[category] ?? defaultSeedingOrder}
                        onChange={(event) =>
                          updateSeedingOrder(category, event.target.value as AthleteSeedingOrder)
                        }
                        aria-label={`Athlete seeding order for ${category}`}
                      >
                        {SEEDING_ORDER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={outOfSequenceBibs[category] ?? ''}
                        onChange={(event) => updateOutOfSequenceBibs(category, event.target.value)}
                        aria-label={`Out of sequence bib numbers for ${category}`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        inputMode="numeric"
                        step={1}
                        min={0}
                        value={firstRegularBibs[category] ?? ''}
                        onChange={(event) => updateFirstRegularBib(category, event.target.value)}
                        aria-label={`First regular sequence bib number for ${category}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </form>
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
  onConfirm,
  variant = 'error',
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  onConfirm?: () => void
  variant?: 'error' | 'success' | 'default'
  wide?: boolean
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
      className={`alert-modal alert-modal--${variant}${wide ? ' alert-modal--wide' : ''}`}
      aria-labelledby="alert-modal-title"
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close()
      }}
    >
      <h2 id="alert-modal-title">{title}</h2>
      {children}
      <button
        type="button"
        className="alert-modal-ok"
        onClick={() => {
          onConfirm?.()
          dialogRef.current?.close()
        }}
      >
        OK
      </button>
    </dialog>
  )
}
