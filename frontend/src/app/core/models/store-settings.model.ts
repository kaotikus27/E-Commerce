export type DayOfWeekName = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

/** A single weekday's online-ordering window. closeTime === null means "open through midnight". */
export interface DaySchedule {
  dayOfWeek: DayOfWeekName;
  openTime: string | null; // "HH:mm"
  closeTime: string | null; // "HH:mm" or null
  closedAllDay: boolean;
}

export interface StoreSettings {
  emergencyPause: boolean;
  schedule: DaySchedule[];
  orderLeadTimeMinutes: number;
  stopOrderingBeforeCloseMinutes: number;
}

export interface StoreClosure {
  id: number;
  date: string; // "YYYY-MM-DD"
  reason: string;
}

/** What GET /api/v1/store actually returns — used by the customer-facing StoreService. */
export interface StoreInfo {
  name: string;
  address: string;
  phone: string;
  mapUrl: string;
  open: boolean;
  todayHoursLabel: string;
  orderLeadTimeMinutes: number;
  schedule: DaySchedule[];
}
