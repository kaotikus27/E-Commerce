import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DeliveryQuote, DeliveryQuoteResult, GeocodeCandidate } from '../models/delivery.model';

/** Delivery fee quote lookup at checkout — quotation only, no dispatch (Phase 1 of the Lalamove
 *  integration). A quote is only valid for 5 minutes and single-use; the backend is authoritative
 *  on both, this just mirrors expiry so the UI can warn the customer before it lapses. */
@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private api = inject(ApiService);

  readonly quote = signal<DeliveryQuote | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  /** Set when the last search matched more than one genuinely different place (e.g. a landmark
   *  name that exists in two different cities) — the customer picks one via {@link chooseCandidate}. */
  readonly candidates = signal<GeocodeCandidate[] | null>(null);

  readonly isExpired = computed(() => {
    const q = this.quote();
    return !q || Date.now() >= new Date(q.expiresAt).getTime();
  });

  private lastAddress = '';

  getQuote(address: string) {
    this.lastAddress = address;
    this.candidates.set(null);
    this.loading.set(true);
    this.error.set('');
    return this.api.post<DeliveryQuoteResult>('/delivery/quote', { address }).pipe(
      tap(result => {
        this.loading.set(false);
        if (result.candidates?.length) {
          this.candidates.set(result.candidates);
          this.quote.set(null);
        } else {
          this.quote.set(result.quote);
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.loading.set(false);
        this.quote.set(null);
        this.error.set(err.error?.message || 'Could not get a delivery quote for that address.');
        return of(null);
      })
    );
  }

  /** Re-requests the quote using an exact candidate the customer picked from an ambiguous
   *  search — skips geocoding entirely on the backend, so this always resolves to a quote. */
  chooseCandidate(candidate: GeocodeCandidate) {
    this.candidates.set(null);
    this.loading.set(true);
    this.error.set('');
    return this.api.post<DeliveryQuoteResult>('/delivery/quote', {
      address: this.lastAddress,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      resolvedLabel: candidate.label,
    }).pipe(
      tap(result => {
        this.loading.set(false);
        this.quote.set(result.quote);
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
    this.candidates.set(null);
    this.error.set('');
  }
}
