import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DeliveryQuote } from '../models/delivery.model';

/** Delivery fee quote lookup at checkout — quotation only, no dispatch (Phase 1 of the Lalamove
 *  integration). A quote is only valid for 5 minutes and single-use; the backend is authoritative
 *  on both, this just mirrors expiry so the UI can warn the customer before it lapses. */
@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private api = inject(ApiService);

  readonly quote = signal<DeliveryQuote | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly isExpired = computed(() => {
    const q = this.quote();
    return !q || Date.now() >= new Date(q.expiresAt).getTime();
  });

  getQuote(address: string) {
    this.loading.set(true);
    this.error.set('');
    return this.api.post<DeliveryQuote>('/delivery/quote', { address }).pipe(
      tap(quote => {
        this.loading.set(false);
        this.quote.set(quote);
      }),
      catchError((err: HttpErrorResponse) => {
        this.loading.set(false);
        this.quote.set(null);
        this.error.set(err.error?.message || 'Could not get a delivery quote for that address.');
        return of(null);
      })
    );
  }

  clear() {
    this.quote.set(null);
    this.error.set('');
  }
}
