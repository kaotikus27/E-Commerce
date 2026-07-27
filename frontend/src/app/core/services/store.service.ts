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

  readonly name = computed(() => this.info()?.name ?? 'Home by Bami');
  readonly address = computed(() => this.info()?.address ?? '048 Kay Piskal Rd, Brgy. Tigbe, Norzagaray, Bulacan');
  readonly phone = computed(() => this.info()?.phone ?? '');
  readonly mapUrl = computed(() => this.info()?.mapUrl ?? '');
  readonly isOpen = computed(() => this.info()?.open ?? false);
  readonly todayHoursLabel = computed(() => this.info()?.todayHoursLabel ?? '…');
  readonly leadTimeMinutes = computed(() => this.info()?.orderLeadTimeMinutes ?? 15);
  readonly schedule = computed<DaySchedule[]>(() => this.info()?.schedule ?? []);
  readonly gcashAccountName = computed(() => this.info()?.gcashAccountName ?? '');
  readonly gcashNumber = computed(() => this.info()?.gcashNumber ?? '');

  constructor() {
    this.poll();
    setInterval(() => this.poll(), POLL_MS);
  }

  private poll() {
    this.api.get<StoreInfo>('/store').pipe(
      catchError(() => of(null))
    ).subscribe(info => {
      if (info) this.info.set(info);
    });
  }
}
