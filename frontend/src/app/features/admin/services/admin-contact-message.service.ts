import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ContactMessage } from '../../../core/models/contact-message.model';

/** Contact-form submissions for the admin Messages inbox. Read-only content (no edit) — only
 *  read/unread and delete are admin actions. Does not fall back to mock data on error. */
@Injectable({ providedIn: 'root' })
export class AdminContactMessageService {
  private api = inject(ApiService);
  private notifications = inject(NotificationService);

  readonly messages = signal<ContactMessage[]>([]);
  readonly loading = signal(false);

  loadMessages() {
    this.loading.set(true);
    this.api.get<ContactMessage[]>('/admin/contact-messages').pipe(
      tap(() => this.loading.set(false)),
      catchError(() => {
        this.loading.set(false);
        this.notifications.error('Could not load messages. Is the backend running?');
        return of<ContactMessage[]>([]);
      })
    ).subscribe(messages => this.messages.set(messages));
  }

  setRead(id: number, read: boolean) {
    this.messages.update(list => list.map(m => (m.id === id ? { ...m, read } : m)));
    return this.api.patch<ContactMessage>(`/admin/contact-messages/${id}/read`, { read }).pipe(
      catchError(() => {
        this.messages.update(list => list.map(m => (m.id === id ? { ...m, read: !read } : m)));
        this.notifications.error('Could not update the message.');
        return of(null);
      })
    );
  }

  deleteMessage(id: number) {
    return this.api.delete<void>(`/admin/contact-messages/${id}`).pipe(
      tap(() => this.messages.update(list => list.filter(m => m.id !== id))),
      catchError(() => {
        this.notifications.error('Could not delete the message.');
        return of(null);
      })
    );
  }
}
