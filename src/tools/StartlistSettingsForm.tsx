import type { ChangeEvent } from 'react'
import type { AgeCategory, StartlistSettings } from './startlistSettings'
import './StartlistSettingsForm.css'

interface StartlistSettingsFormProps {
  settings: StartlistSettings
  onChange: (settings: StartlistSettings) => void
}

export function StartlistSettingsForm({ settings, onChange }: StartlistSettingsFormProps) {
  const update = <K extends keyof StartlistSettings>(key: K, value: StartlistSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const handleNumberChange =
    (key: keyof StartlistSettings) => (event: ChangeEvent<HTMLInputElement>) => {
      update(key, Number(event.target.value) as StartlistSettings[typeof key])
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
        <div className="settings-grid">
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
          <label className="settings-field">
            <span>First Swim Wave Start Time</span>
            <input
              type="time"
              value={settings.swimStartTime}
              onChange={(e) => update('swimStartTime', e.target.value)}
            />
          </label>
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
        </div>
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
