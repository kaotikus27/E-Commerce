import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DiscountType, PromoCode } from '../../../core/models/promo-code.model';

export interface PromoCodePayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  active: boolean;
}

/** Promo code data for the admin Promo Codes page. Does not fall back to mock data on error. */
@Injectable({ providedIn: 'root' })
export class AdminPromoCodeService {
  private api = inject(ApiService);
  private notifications = inject(NotificationService);

  readonly promoCodes = signal<PromoCode[]>([]);
  readonly loading = signal(false);

  loadPromoCodes() {
    this.loading.set(true);
    this.api.get<PromoCode[]>('/admin/promo-codes').pipe(
      tap(() => this.loading.set(false)),
      catchError(() => {
        this.loading.set(false);
        this.notifications.error('Could not load promo codes. Is the backend running?');
        return of<PromoCode[]>([]);
      })
    ).subscribe(promoCodes => this.promoCodes.set(promoCodes));
  }

  createPromoCode(payload: PromoCodePayload) {
    return this.api.post<PromoCode>('/admin/promo-codes', payload).pipe(
      tap(created => this.promoCodes.update(list => [...list, created])),
      catchError(err => {
        this.notifications.error(err.error?.message || 'Could not create the promo code.');
        return of(null);
      })
    );
  }

  updatePromoCode(id: number, payload: PromoCodePayload) {
    return this.api.put<PromoCode>(`/admin/promo-codes/${id}`, payload).pipe(
      tap(updated => this.promoCodes.update(list => list.map(p => (p.id === id ? updated : p)))),
      catchError(err => {
        this.notifications.error(err.error?.message || 'Could not update the promo code.');
        return of(null);
      })
    );
  }

  deletePromoCode(id: number) {
    return this.api.delete<void>(`/admin/promo-codes/${id}`).pipe(
      tap(() => this.promoCodes.update(list => list.filter(p => p.id !== id))),
      catchError(() => {
        this.notifications.error('Could not delete the promo code.');
        return of(null);
      })
    );
  }

  toggleActive(id: number, active: boolean) {
    this.promoCodes.update(list => list.map(p => (p.id === id ? { ...p, active } : p)));
    return this.api.patch<PromoCode>(`/admin/promo-codes/${id}/active`, { active }).pipe(
      catchError(() => {
        this.promoCodes.update(list => list.map(p => (p.id === id ? { ...p, active: !active } : p)));
        this.notifications.error('Could not update the promo code.');
        return of(null);
      })
    );
  }
}
