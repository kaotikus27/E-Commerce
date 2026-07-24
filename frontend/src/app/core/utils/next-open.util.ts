import { DaySchedule } from '../models/store-settings.model';

const DAY_ORDER = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_LABEL: Record<string, string> = {
  SUNDAY: 'Sunday', MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday',
};

export function formatHHmm(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
}

/** Scans forward from tomorrow for the next non-closed day, e.g. "tomorrow at 5:00 PM" / "on Tuesday at 5:00 PM". */
export function nextOpenLabel(schedule: DaySchedule[]): string {
  if (!schedule.length) return '';

  const todayIndex = new Date().getDay(); // 0 Sun - 6 Sat
  for (let offset = 1; offset <= 7; offset++) {
    const dayName = DAY_ORDER[(todayIndex + offset) % 7];
    const day = schedule.find(d => d.dayOfWeek === dayName);
    if (day && !day.closedAllDay && day.openTime) {
      const when = offset === 1 ? 'tomorrow' : `on ${DAY_LABEL[dayName]}`;
      return `${when} at ${formatHHmm(day.openTime)}`;
    }
  }
  return '';
}
