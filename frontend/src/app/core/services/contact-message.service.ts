import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ContactMessageRequest } from '../models/contact-message.model';

/** Public contact-form submission. Does not fall back to a fake success on error — a failed
 *  submission needs to be visible to the customer, same principle as checkout. */
@Injectable({ providedIn: 'root' })
export class ContactMessageService {
  private api = inject(ApiService);

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');

  submit(request: ContactMessageRequest) {
    this.submitting.set(true);
    this.error.set('');
    return this.api.post<void>('/contact-messages', request).pipe(
      tap(() => {
        this.submitting.set(false);
        this.submitted.set(true);
      }),
      catchError((err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || "Could not send your message — please try again.");
        return of(null);
      })
    );
  }

  reset() {
    this.submitted.set(false);
    this.error.set('');
  }
}
