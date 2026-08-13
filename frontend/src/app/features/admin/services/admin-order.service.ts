import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AdminOrder, OrderStatus } from '../../../core/models/order.model';

/**
 * Live Orders data for the admin kanban board. Deliberately does NOT fall back to mock
 * data on error (unlike the customer-facing services) — an admin dashboard showing fake
 * orders would be actively misleading, so failures surface as a toast instead.
 */
@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private api = inject(ApiService);
  private notifications = inject(NotificationService);

  readonly orders = signal<AdminOrder[]>([]);
  readonly loading = signal(false);

  readonly received = computed(() => this.orders().filter(o => o.status === 'RECEIVED'));
  readonly preparing = computed(() => this.orders().filter(o => o.status === 'PREPARING'));
  readonly ready = computed(() => this.orders().filter(o => o.status === 'READY'));
  readonly completed = computed(() => this.orders().filter(o => o.status === 'COMPLETED'));

  /** Archived orders — completed or cancelled, no longer on the live kanban board. */
  readonly history = computed(() => this.orders().filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED'));

  private readonly todayCompleted = computed(() =>
    this.completed().filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString())
  );

  readonly todayRevenue = computed(() => this.todayCompleted().reduce((sum, o) => sum + o.total, 0));
  readonly todayCompletedCount = computed(() => this.todayCompleted().length);

  readonly topItemsToday = computed(() => {
    const tally = new Map<string, number>();
    for (const order of this.todayCompleted()) {
      for (const item of order.items) {
        tally.set(item.productName, (tally.get(item.productName) ?? 0) + item.quantity);
      }
    }
    return [...tally.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  });

  loadOrders() {
    this.loading.set(true);
    this.api.get<AdminOrder[]>('/admin/orders').pipe(
      tap(() => this.loading.set(false)),
      catchError(() => {
        this.loading.set(false);
        this.notifications.error('Could not load orders. Is the backend running?');
        return of<AdminOrder[]>([]);
      })
    ).subscribe(orders => this.orders.set(orders));
  }

  updateStatus(orderNumber: string, status: OrderStatus, cancelReason?: string) {
    return this.api.patch<AdminOrder>(`/admin/orders/${orderNumber}/status`, { status, cancelReason }).pipe(
      tap(updated => {
        this.orders.update(list => list.map(o => (o.id === updated.id ? updated : o)));
      }),
      catchError(() => {
        this.notifications.error('Could not update the order. Please try again.');
        return of(null);
      })
    );
  }

  markPaid(orderNumber: string) {
    return this.api.patch<AdminOrder>(`/admin/orders/${orderNumber}/mark-paid`, {}).pipe(
      tap(updated => {
        this.orders.update(list => list.map(o => (o.id === updated.id ? updated : o)));
      }),
      catchError(() => {
        this.notifications.error('Could not mark the order as paid.');
        return of(null);
      })
    );
  }

  /** Staff has cross-checked the GCash reference number — mark paid and move straight to Preparing.
   *  confirmedReference (if the admin edited/corrected it) becomes the order's official gcashReference. */
  verifyAndAcceptPayment(orderNumber: string, confirmedReference?: string) {
    return this.api.patch<AdminOrder>(`/admin/orders/${orderNumber}/verify-payment`, { confirmedReference }).pipe(
      tap(updated => {
        this.orders.update(list => list.map(o => (o.id === updated.id ? updated : o)));
      }),
      catchError(() => {
        this.notifications.error('Could not verify the payment.');
        return of(null);
      })
    );
  }

  /** Admin manually attaches/replaces a receipt screenshot during verification — e.g. the
   *  customer sent proof through another channel, or the original upload was unreadable. */
  uploadReceipt(orderNumber: string, file: File) {
    const formData = new FormData();
    formData.append('receiptImage', file);
    return this.api.patch<AdminOrder>(`/admin/orders/${orderNumber}/receipt`, formData).pipe(
      tap(updated => {
        this.orders.update(list => list.map(o => (o.id === updated.id ? updated : o)));
      }),
      catchError(() => {
        this.notifications.error('Could not upload the receipt image.');
        return of(null);
      })
    );
  }

  /** Admin clicks "Call Lalamove Rider" — places a real Lalamove order (Phase 2). */
  dispatchDelivery(orderNumber: string) {
    return this.api.patch<AdminOrder>(`/admin/orders/${orderNumber}/dispatch`, {}).pipe(
      tap(updated => {
        this.orders.update(list => list.map(o => (o.id === updated.id ? updated : o)));
      }),
      catchError((err: HttpErrorResponse) => {
        this.notifications.error(err.error?.message || 'Could not dispatch the delivery.');
        return of(null);
      })
    );
  }

  /** Admin clicks "Refresh Delivery Status" — pulls current status/driver directly from Lalamove
   *  instead of waiting on a webhook that may never arrive (e.g. no public tunnel reaches this
   *  backend in dev). Fallback path, not a replacement for the webhook. */
  syncDeliveryStatus(orderNumber: string) {
    return this.api.patch<AdminOrder>(`/admin/orders/${orderNumber}/sync-delivery-status`, {}).pipe(
      tap(updated => {
        this.orders.update(list => list.map(o => (o.id === updated.id ? updated : o)));
      }),
      catchError((err: HttpErrorResponse) => {
        this.notifications.error(err.error?.message || 'Could not sync the delivery status.');
        return of(null);
      })
    );
  }

  /** Client-side search over the archived (completed/cancelled) list by name, order #, or phone. */
  searchHistory(query: string): AdminOrder[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.history();
    return this.history().filter(o =>
      o.id.toLowerCase().includes(q) ||
      (o.guestName?.toLowerCase().includes(q) ?? false) ||
      (o.guestPhone?.toLowerCase().includes(q) ?? false)
    );
  }
}
