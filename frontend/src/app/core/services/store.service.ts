import { Injectable, computed, signal } from '@angular/core';

export interface StoreHours { day: string; open: string; close: string; }

/** Store hours, open/closed status, and location info for the sticky locator banner. */
@Injectable({ providedIn: 'root' })
export class StoreService {
  readonly name = 'Sage & Cream Bakehouse';
  readonly address = '221 Maple Street, Riverside Commons';
  readonly mapUrl = 'https://maps.google.com/?q=Sage+and+Cream+Bakehouse';
  readonly phone = '(555) 213-4477';

  readonly hours: StoreHours[] = [
    { day: 'Mon-Fri', open: '07:00', close: '18:00' },
    { day: 'Sat-Sun', open: '08:00', close: '16:00' },
  ];

  readonly now = signal(new Date());

  readonly isOpen = computed(() => {
    const d = this.now();
    const day = d.getDay(); // 0 Sun - 6 Sat
    const minutes = d.getHours() * 60 + d.getMinutes();
    const isWeekend = day === 0 || day === 6;
    const [openStr, closeStr] = isWeekend ? ['08:00', '16:00'] : ['07:00', '18:00'];
    const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    return minutes >= toMin(openStr) && minutes < toMin(closeStr);
  });

  readonly todayHoursLabel = computed(() => {
    const isWeekend = this.now().getDay() === 0 || this.now().getDay() === 6;
    return isWeekend ? '8:00 AM - 4:00 PM' : '7:00 AM - 6:00 PM';
  });
}
