export type AgeCategory = 'Senior' | 'Junior'

export interface StartlistSettings {
  ageCategory: AgeCategory
  registrationStartTime: string
  registrationEndTime: string
  registrationSlots: number
  swimLanes: number
  swimmersPerLane: number
  swimStartTime: string
  averageSwimTimeInMinutes: number
  bikesPerRack: number
}

export const defaultStartlistSettings: StartlistSettings = {
  ageCategory: 'Senior',
  registrationStartTime: '',
  registrationEndTime: '',
  registrationSlots: 1,
  swimLanes: 1,
  swimmersPerLane: 2,
  swimStartTime: '',
  averageSwimTimeInMinutes: 9,
  bikesPerRack: 5,
}
