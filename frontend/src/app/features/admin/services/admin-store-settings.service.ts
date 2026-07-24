import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { StoreClosure, StoreSettings } from '../../../core/models/store-settings.model';

@Injectable({ providedIn: 'root' })
export class AdminStoreSettingsService {
  private api = inject(ApiService);
  private notifications = inject(NotificationService);

  readonly settings = signal<StoreSettings | null>(null);
  readonly closures = signal<StoreClosure[]>([]);
  readonly loading = signal(false);

  loadSettings() {
    this.loading.set(true);
    this.api.get<StoreSettings>('/admin/store-settings').pipe(
      tap(() => this.loading.set(false)),
      catchError(() => {
        this.loading.set(false);
        this.notifications.error('Could not load store settings.');
        return of(null);
      })
    ).subscribe(settings => { if (settings) this.settings.set(settings); });
  }

  saveSchedule(payload: StoreSettings) {
    return this.api.put<StoreSettings>('/admin/store-settings', payload).pipe(
      tap(saved => this.settings.set(saved)),
      catchError(() => {
        this.notifications.error('Could not save store settings.');
        return of(null);
      })
    );
  }

  setPause(emergencyPause: boolean) {
    return this.api.patch<StoreSettings>('/admin/store-settings/pause', { emergencyPause }).pipe(
      tap(saved => this.settings.set(saved)),
      catchError(() => {
        this.notifications.error('Could not update the pause switch.');
        return of(null);
      })
    );
  }

  loadClosures() {
    this.api.get<StoreClosure[]>('/admin/store-closures').pipe(
      catchError(() => {
        this.notifications.error('Could not load holiday closures.');
        return of<StoreClosure[]>([]);
      })
    ).subscribe(closures => this.closures.set(closures));
  }

  addClosure(date: string, reason: string) {
    return this.api.post<StoreClosure>('/admin/store-closures', { date, reason }).pipe(
      tap(created => this.closures.update(list => [...list, created].sort((a, b) => a.date.localeCompare(b.date)))),
      catchError(() => {
        this.notifications.error('Could not add that closure — it may already be marked closed.');
        return of(null);
      })
    );
  }

  removeClosure(id: number) {
    return this.api.delete<void>(`/admin/store-closures/${id}`).pipe(
      tap(() => this.closures.update(list => list.filter(c => c.id !== id))),
      catchError(() => {
        this.notifications.error('Could not remove that closure.');
        return of(null);
      })
    );
  }
}
