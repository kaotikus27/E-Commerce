import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Promotion } from '../../../core/models/promotion.model';

export interface PromotionPayload {
  title: string;
  description: string;
  buttonLabel: string;
  buttonLink: string;
  active: boolean;
  sortOrder: number;
}

/** Promo banner data for the admin Promotions page. Does not fall back to mock data on error. */
@Injectable({ providedIn: 'root' })
export class AdminPromotionService {
  private api = inject(ApiService);
  private notifications = inject(NotificationService);

  readonly promotions = signal<Promotion[]>([]);
  readonly loading = signal(false);

  loadPromotions() {
    this.loading.set(true);
    this.api.get<Promotion[]>('/admin/promotions').pipe(
      tap(() => this.loading.set(false)),
      catchError(() => {
        this.loading.set(false);
        this.notifications.error('Could not load promotions. Is the backend running?');
        return of<Promotion[]>([]);
      })
    ).subscribe(promotions => this.promotions.set(promotions));
  }

  createPromotion(payload: PromotionPayload) {
    return this.api.post<Promotion>('/admin/promotions', payload).pipe(
      tap(created => this.promotions.update(list => [...list, created])),
      catchError(() => {
        this.notifications.error('Could not create the promotion.');
        return of(null);
      })
    );
  }

  updatePromotion(id: number, payload: PromotionPayload) {
    return this.api.put<Promotion>(`/admin/promotions/${id}`, payload).pipe(
      tap(updated => this.promotions.update(list => list.map(p => (p.id === id ? updated : p)))),
      catchError(() => {
        this.notifications.error('Could not update the promotion.');
        return of(null);
      })
    );
  }

  deletePromotion(id: number) {
    return this.api.delete<void>(`/admin/promotions/${id}`).pipe(
      tap(() => this.promotions.update(list => list.filter(p => p.id !== id))),
      catchError(() => {
        this.notifications.error('Could not delete the promotion.');
        return of(null);
      })
    );
  }

  toggleActive(id: number, active: boolean) {
    this.promotions.update(list => list.map(p => (p.id === id ? { ...p, active } : p)));
    return this.api.patch<Promotion>(`/admin/promotions/${id}/active`, { active }).pipe(
      catchError(() => {
        this.promotions.update(list => list.map(p => (p.id === id ? { ...p, active: !active } : p)));
        this.notifications.error('Could not update the promotion.');
        return of(null);
      })
    );
  }
}
