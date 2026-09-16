import { useState, type ChangeEvent } from 'react'
import {
  GENDER_CATEGORY_OPTIONS,
  type AgeCategory,
  type GenderCategory,
  type StartlistSettings,
  type SwimVenue,
} from './startlistSettings'
import './StartlistSettingsForm.css'

const SWIM_VENUE_OPTIONS: SwimVenue[] = ['Pool', 'Sea']
const AGE_CUTOFF_MIN = 17
const AGE_CUTOFF_MAX = 80

function parseAgeCutoff(value: string): number | null {
  if (!/^-?\d+$/.test(value.trim())) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < AGE_CUTOFF_MIN || parsed > AGE_CUTOFF_MAX) return null
  return parsed
}

interface StartlistSettingsFormProps {
  settings: StartlistSettings
  onChange: (settings: StartlistSettings) => void
}

export function StartlistSettingsForm({ settings, onChange }: StartlistSettingsFormProps) {
  const [draftGenderCategory, setDraftGenderCategory] = useState<GenderCategory>('Open')
  const [draftAgeCutoff, setDraftAgeCutoff] = useState('')

  const update = <K extends keyof StartlistSettings>(key: K, value: StartlistSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const handleNumberChange =
    (key: keyof StartlistSettings) => (event: ChangeEvent<HTMLInputElement>) => {
      update(key, Number(event.target.value) as StartlistSettings[typeof key])
    }

  const parsedAgeCutoff = parseAgeCutoff(draftAgeCutoff)
  const isDuplicateSplit =
    parsedAgeCutoff !== null &&
    settings.seaAgeWaveSplits.some(
      (split) =>
        split.genderCategory === draftGenderCategory && split.ageCutoff === parsedAgeCutoff,
    )
  const canAddAgeSplit = parsedAgeCutoff !== null && !isDuplicateSplit

  const addAgeWaveSplit = () => {
    if (parsedAgeCutoff === null || isDuplicateSplit) return
    update('seaAgeWaveSplits', [
      ...settings.seaAgeWaveSplits,
      { genderCategory: draftGenderCategory, ageCutoff: parsedAgeCutoff },
    ])
    setDraftAgeCutoff('')
  }

  const removeAgeWaveSplit = (index: number) => {
    update(
      'seaAgeWaveSplits',
      settings.seaAgeWaveSplits.filter((_, splitIndex) => splitIndex !== index),
    )
  }

  return (
    <form className="settings-form" onSubmit={(e) => e.preventDefault()}>
      <h2 className="settings-heading">Processing settings</h2>

      <fieldset className="settings-fieldset">
        <legend>General</legend>
        <label className="settings-field">
          <span>Which Age Category are you generating a Start List For?</span>
          <select
            value={settings.ageCategory}
            onChange={(e) => update('ageCategory', e.target.value as AgeCategory)}
          >
            <option value="Senior">Senior</option>
            <option value="Junior">Junior</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="settings-fieldset">
        <legend>Registration</legend>
        <div className="settings-grid">
          <label className="settings-field">
            <span>Opening Time</span>
            <input
              type="time"
              value={settings.registrationStartTime}
              onChange={(e) => update('registrationStartTime', e.target.value)}
            />
          </label>
          <label className="settings-field">
            <span>Closing Time</span>
            <input
              type="time"
              value={settings.registrationEndTime}
              onChange={(e) => update('registrationEndTime', e.target.value)}
            />
          </label>
          <label className="settings-field">
            <span>Number of Slots</span>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={settings.registrationSlots}
              onChange={handleNumberChange('registrationSlots')}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-fieldset">
        <legend>Swim</legend>
        <div className="settings-field settings-field--toggle">
          <span id="swim-venue-label">Swim Type</span>
          <div
            className="settings-toggle"
            role="group"
            aria-labelledby="swim-venue-label"
          >
            {SWIM_VENUE_OPTIONS.map((venue) => (
              <button
                key={venue}
                type="button"
                className={
                  settings.swimVenue === venue
                    ? 'settings-toggle-option is-active'
                    : 'settings-toggle-option'
                }
                aria-pressed={settings.swimVenue === venue}
                onClick={() => update('swimVenue', venue)}
              >
                {venue}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-grid">
          {settings.swimVenue === 'Pool' && (
            <>
              <label className="settings-field">
                <span>Number of Swim Lanes</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={settings.swimLanes}
                  onChange={handleNumberChange('swimLanes')}
                />
              </label>
              <label className="settings-field">
                <span>Swimmers Per Lane</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={settings.swimmersPerLane}
                  onChange={handleNumberChange('swimmersPerLane')}
                />
              </label>
            </>
          )}
          <label className="settings-field">
            <span>First Swim Wave Start Time</span>
            <input
              type="time"
              value={settings.swimStartTime}
              onChange={(e) => update('swimStartTime', e.target.value)}
            />
          </label>
          {settings.swimVenue === 'Pool' && (
            <label className="settings-field">
              <span>Average Swim Time (minutes)</span>
              <input
                type="number"
                min={1}
                max={60}
                step={1}
                value={settings.averageSwimTimeInMinutes}
                onChange={handleNumberChange('averageSwimTimeInMinutes')}
              />
            </label>
          )}
          <label className="settings-field">
            <span>Gap Between Each Race Category (minutes)</span>
            <input
              type="number"
              min={0}
              max={60}
              step={1}
              value={settings.gapBetweenRaceCategoriesInMinutes}
              onChange={handleNumberChange('gapBetweenRaceCategoriesInMinutes')}
            />
          </label>
        </div>
        {settings.swimVenue === 'Sea' && (
          <div className="settings-age-splits">
            <label className="settings-field settings-field--checkbox">
              <input
                type="checkbox"
                checked={settings.splitStartWavesByAgeCategories}
                onChange={(event) =>
                  update('splitStartWavesByAgeCategories', event.target.checked)
                }
              />
              <span>I want to split the start waves by Age Categories</span>
            </label>
            {settings.splitStartWavesByAgeCategories && (
              <>
                <div className="settings-age-split-row">
                  <label className="settings-field">
                    <span>Gender Category</span>
                    <select
                      value={draftGenderCategory}
                      onChange={(event) =>
                        setDraftGenderCategory(event.target.value as GenderCategory)
                      }
                    >
                      {GENDER_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="settings-field">
                    <span>Age Cut-off</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={AGE_CUTOFF_MIN}
                      max={AGE_CUTOFF_MAX}
                      step={1}
                      value={draftAgeCutoff}
                      onChange={(event) => setDraftAgeCutoff(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="settings-add-btn"
                    onClick={addAgeWaveSplit}
                    disabled={!canAddAgeSplit}
                  >
                    Add
                  </button>
                </div>
                {settings.seaAgeWaveSplits.length > 0 && (
                  <ul className="settings-age-split-list">
                    {settings.seaAgeWaveSplits.map((split, index) => (
                      <li key={`${split.genderCategory}-${split.ageCutoff}-${index}`}>
                        <span>
                          {split.genderCategory} — {split.ageCutoff}
                        </span>
                        <button
                          type="button"
                          className="settings-remove-btn"
                          onClick={() => removeAgeWaveSplit(index)}
                          aria-label={`Remove ${split.genderCategory} age cut-off ${split.ageCutoff}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
        {settings.swimVenue === 'Sea' && settings.splitStartWavesByAgeCategories && (
          <p className="settings-age-split-note">
            NOTE: the order in which you create these Age Categories matters. The first group
            created will start first.
          </p>
        )}
      </fieldset>

      <fieldset className="settings-fieldset">
        <legend>Bike</legend>
        <label className="settings-field">
          <span>Number of Bikes per Rack</span>
          <input
            type="number"
            min={1}
            max={20}
            step={1}
            value={settings.bikesPerRack}
            onChange={handleNumberChange('bikesPerRack')}
          />
        </label>
      </fieldset>
    </form>
  )
}
