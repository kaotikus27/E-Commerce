import { Injectable, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { Promotion } from '../models/promotion.model';

/** Loads active promo banners for the storefront homepage. */
@Injectable({ providedIn: 'root' })
export class PromotionService {
  readonly promotions = signal<Promotion[]>([]);

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    this.api.get<Promotion[]>('/promotions').pipe(
      catchError(() => of([]))
    ).subscribe(data => this.promotions.set(data));
  }
}
