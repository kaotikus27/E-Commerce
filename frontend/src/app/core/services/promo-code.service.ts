import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { PromoValidationResult } from '../models/promo-code.model';

/** Checkout-time promo code preview — the discount shown here is only a preview; the backend
 *  re-validates and resolves it authoritatively again at order placement (same principle as
 *  customization surcharges), so this never has to be trusted for the actual charge. */
@Injectable({ providedIn: 'root' })
export class PromoCodeService {
  private api = inject(ApiService);

  readonly applied = signal<PromoValidationResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  apply(code: string, subtotal: number) {
    this.loading.set(true);
    this.error.set('');
    return this.api.post<PromoValidationResult>('/promo-codes/validate', { code, subtotal }).pipe(
      tap(result => {
        this.loading.set(false);
        this.applied.set(result);
      }),
      catchError((err: HttpErrorResponse) => {
        this.loading.set(false);
        this.applied.set(null);
        this.error.set(err.error?.message || "That promo code couldn't be applied.");
        return of(null);
      })
    );
  }

  clear() {
    this.applied.set(null);
    this.error.set('');
  }
}
