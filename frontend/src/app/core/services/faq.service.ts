import { Injectable, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { Faq } from '../models/faq.model';

/** Loads active FAQs for the storefront FAQ page. */
@Injectable({ providedIn: 'root' })
export class FaqService {
  readonly faqs = signal<Faq[]>([]);

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    this.api.get<Faq[]>('/faqs').pipe(
      catchError(() => of([]))
    ).subscribe(data => this.faqs.set(data));
  }
}
