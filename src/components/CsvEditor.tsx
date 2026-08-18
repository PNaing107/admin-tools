import { useCallback } from 'react'
import type { CsvData } from '../utils/csv'
import './CsvEditor.css'

interface CsvEditorProps {
  data: CsvData
  onChange: (data: CsvData) => void
  fileName: string
  onFileNameChange: (name: string) => void
}

export function CsvEditor({ data, onChange, fileName, onFileNameChange }: CsvEditorProps) {
  const colCount = Math.max(...data.map((row) => row.length), 1)

  const updateCell = useCallback(
    (rowIndex: number, colIndex: number, value: string) => {
      onChange(
        data.map((row, r) =>
          r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row,
        ),
      )
    },
    [data, onChange],
  )

  const addRow = useCallback(() => {
    onChange([...data, Array(colCount).fill('')])
  }, [colCount, data, onChange])

  const removeRow = useCallback(
    (rowIndex: number) => {
      if (data.length <= 1) return
      onChange(data.filter((_, i) => i !== rowIndex))
    },
    [data, onChange],
  )

  const addColumn = useCallback(() => {
    onChange(data.map((row) => [...row, '']))
  }, [data, onChange])

  const removeColumn = useCallback(
    (colIndex: number) => {
      if (colCount <= 1) return
      onChange(data.map((row) => row.filter((_, i) => i !== colIndex)))
    },
    [colCount, data, onChange],
  )

  return (
    <section className="csv-editor">
      <div className="editor-meta">
        <label className="file-name-label">
          File name
          <input
            type="text"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            spellCheck={false}
          />
        </label>
        <span className="stats">
          {data.length} rows × {colCount} columns
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="row-actions-header" aria-label="Row actions" />
              {Array.from({ length: colCount }, (_, colIndex) => (
                <th key={colIndex}>
                  <div className="col-header">
                    <span>Col {colIndex + 1}</span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeColumn(colIndex)}
                      disabled={colCount <= 1}
                      title="Remove column"
                      aria-label={`Remove column ${colIndex + 1}`}
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
              <th className="add-col-header">
                <button type="button" className="icon-btn add" onClick={addColumn} title="Add column">
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="row-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeRow(rowIndex)}
                    disabled={data.length <= 1}
                    title="Remove row"
                    aria-label={`Remove row ${rowIndex + 1}`}
                  >
                    ×
                  </button>
                </td>
                {Array.from({ length: colCount }, (_, colIndex) => (
                  <td key={colIndex}>
                    <input
                      type="text"
                      value={row[colIndex] ?? ''}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}`}
                    />
                  </td>
                ))}
                <td className="spacer" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="add-row-btn" onClick={addRow}>
        + Add row
      </button>
    </section>
  )
}
