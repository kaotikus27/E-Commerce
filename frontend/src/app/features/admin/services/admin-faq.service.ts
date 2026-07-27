import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Faq } from '../../../core/models/faq.model';

export interface FaqPayload {
  question: string;
  answer: string;
  active: boolean;
  sortOrder: number;
}

/** FAQ data for the admin FAQs page. Does not fall back to mock data on error. */
@Injectable({ providedIn: 'root' })
export class AdminFaqService {
  private api = inject(ApiService);
  private notifications = inject(NotificationService);

  readonly faqs = signal<Faq[]>([]);
  readonly loading = signal(false);

  loadFaqs() {
    this.loading.set(true);
    this.api.get<Faq[]>('/admin/faqs').pipe(
      tap(() => this.loading.set(false)),
      catchError(() => {
        this.loading.set(false);
        this.notifications.error('Could not load FAQs. Is the backend running?');
        return of<Faq[]>([]);
      })
    ).subscribe(faqs => this.faqs.set(faqs));
  }

  createFaq(payload: FaqPayload) {
    return this.api.post<Faq>('/admin/faqs', payload).pipe(
      tap(created => this.faqs.update(list => [...list, created])),
      catchError(() => {
        this.notifications.error('Could not create the FAQ.');
        return of(null);
      })
    );
  }

  updateFaq(id: number, payload: FaqPayload) {
    return this.api.put<Faq>(`/admin/faqs/${id}`, payload).pipe(
      tap(updated => this.faqs.update(list => list.map(f => (f.id === id ? updated : f)))),
      catchError(() => {
        this.notifications.error('Could not update the FAQ.');
        return of(null);
      })
    );
  }

  deleteFaq(id: number) {
    return this.api.delete<void>(`/admin/faqs/${id}`).pipe(
      tap(() => this.faqs.update(list => list.filter(f => f.id !== id))),
      catchError(() => {
        this.notifications.error('Could not delete the FAQ.');
        return of(null);
      })
    );
  }

  toggleActive(id: number, active: boolean) {
    this.faqs.update(list => list.map(f => (f.id === id ? { ...f, active } : f)));
    return this.api.patch<Faq>(`/admin/faqs/${id}/active`, { active }).pipe(
      catchError(() => {
        this.faqs.update(list => list.map(f => (f.id === id ? { ...f, active: !active } : f)));
        this.notifications.error('Could not update the FAQ.');
        return of(null);
      })
    );
  }
}
