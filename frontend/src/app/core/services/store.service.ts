import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { DaySchedule, StoreInfo } from '../models/store-settings.model';

const POLL_MS = 20000;

/**
 * Store hours/pause/lead-time are now admin-editable (see AdminStoreSettingsComponent), so this
 * service polls the backend instead of computing everything from the local clock — that's what
 * makes an admin's emergency-pause toggle or hours edit reach the customer "live" without a
 * page refresh.
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private api = inject(ApiService);

  private readonly info = signal<StoreInfo | null>(null);
  private loadedOnce = false;

  readonly name = computed(() => this.info()?.name ?? 'Home by Bami');
  readonly address = computed(() => this.info()?.address ?? '048 Kay Piskal Rd, Brgy. Tigbe, Norzagaray, Bulacan');
  readonly phone = computed(() => this.info()?.phone ?? '');
  readonly mapUrl = computed(() => this.info()?.mapUrl ?? '');
  readonly latitude = computed(() => this.info()?.latitude ?? null);
  readonly longitude = computed(() => this.info()?.longitude ?? null);
  readonly isOpen = computed(() => this.info()?.open ?? false);
  readonly todayHoursLabel = computed(() => this.info()?.todayHoursLabel ?? '…');
  readonly leadTimeMinutes = computed(() => this.info()?.orderLeadTimeMinutes ?? 15);
  readonly schedule = computed<DaySchedule[]>(() => this.info()?.schedule ?? []);
  readonly gcashAccountName = computed(() => this.info()?.gcashAccountName ?? '');
  readonly gcashNumber = computed(() => this.info()?.gcashNumber ?? '');
  readonly gcashQrImagePath = computed(() => this.info()?.gcashQrImagePath ?? '');

  constructor() {
    this.poll();
    setInterval(() => this.poll(), POLL_MS);
  }

  private poll() {
    this.api.get<StoreInfo>('/store').pipe(
      catchError(() => of(null))
    ).subscribe(info => {
      if (info) this.info.set(info);
      this.loadedOnce = true;
    });
  }

  /** Resolves once the first store-info fetch attempt completes (success or failure), or after
   *  a 5s safety timeout. Guards/consumers that need a real `isOpen()` reading on a fresh page
   *  load should await this first — `isOpen()` defaults to `false` until the initial fetch
   *  resolves, which otherwise reads as "closed" during that brief window.
   *
   *  Returns whether the fetch actually completed (true) or the 5s safety timeout fired first
   *  (false) — callers must not treat a `false` return as "confirmed closed". A slow/cold dev
   *  server or a flaky connection can blow past 5s while the store is genuinely open; the only
   *  thing a timeout tells you is "unknown", not "closed". placeOrder() enforces the real open/
   *  closed check authoritatively server-side regardless, so callers can safely fail open here. */
  async ensureLoaded(): Promise<boolean> {
    if (this.loadedOnce) return true;
    return new Promise<boolean>(resolve => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(this.loadedOnce); } };
      const check = () => { if (this.loadedOnce) finish(); else setTimeout(check, 50); };
      check();
      setTimeout(finish, 5000);
    });
  }
}
