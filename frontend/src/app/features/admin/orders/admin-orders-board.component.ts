import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminOrderService } from '../services/admin-order.service';
import { AdminOrder } from '../../../core/models/order.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { NotificationService } from '../../../core/services/notification.service';

const POLL_MS = 8000;
const ORIGINAL_TITLE = 'Home by Bami — Admin';

@Component({
  selector: 'app-admin-orders-board',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <div class="board-header">
      <h1>Live Orders</h1>
      <button class="btn btn-secondary btn-sm" (click)="orderService.loadOrders()">Refresh</button>
    </div>

    <div class="board">
      <section class="column">
        <h2 [class.flash]="flashNew()">New ({{ orderService.received().length }})</h2>
        @for (order of orderService.received(); track order.id) {
          <div class="order-card card">
            <ng-container *ngTemplateOutlet="cardHeader; context: { order }"></ng-container>
            <div class="actions">
              <button class="btn btn-primary btn-sm" (click)="advance(order, 'PREPARING')">Accept Order</button>
              <button class="btn btn-secondary btn-sm" (click)="openReject(order)">Reject</button>
            </div>
          </div>
        } @empty {
          <p class="empty">Nothing waiting.</p>
        }
      </section>

      <section class="column">
        <h2>Preparing ({{ orderService.preparing().length }})</h2>
        @for (order of orderService.preparing(); track order.id) {
          <div class="order-card card">
            <ng-container *ngTemplateOutlet="cardHeader; context: { order }"></ng-container>
            <div class="actions">
              <button class="btn btn-primary btn-sm" (click)="advance(order, 'READY')">Mark Ready</button>
            </div>
          </div>
        } @empty {
          <p class="empty">Nothing preparing.</p>
        }
      </section>

      <section class="column">
        <h2>Ready for Pickup ({{ orderService.ready().length }})</h2>
        @for (order of orderService.ready(); track order.id) {
          <div class="order-card card">
            <ng-container *ngTemplateOutlet="cardHeader; context: { order }"></ng-container>
            <div class="actions">
              <button class="btn btn-primary btn-sm" (click)="advance(order, 'COMPLETED')">Mark Completed</button>
            </div>
          </div>
        } @empty {
          <p class="empty">Nothing ready.</p>
        }
      </section>
    </div>

    <ng-template #cardHeader let-order="order">
      <div class="card-top">
        <strong>#{{ order.id }}</strong>
        <span class="total">₱{{ order.total.toFixed(2) }}</span>
      </div>
      <div class="customer">{{ order.guestName || 'Guest' }} · {{ order.guestPhone }}</div>
      <div class="pickup">Pickup: {{ order.pickupTime }}</div>
      <div class="payment-row">
        <span class="payment">{{ order.paymentMethod === 'CARD' ? 'Card' : 'Cash on Pickup' }}</span>
        <span class="pay-status" [class.paid]="order.paymentStatus === 'PAID'">{{ order.paymentStatus }}</span>
      </div>
      @if (order.paymentStatus === 'UNPAID' && order.paymentMethod === 'CASH_ON_PICKUP') {
        <button class="btn btn-secondary btn-sm mark-paid" (click)="markPaid(order)">Mark as Paid</button>
      }
      <ul class="items">
        @for (item of order.items; track item.productId) {
          <li>{{ item.quantity }}× {{ item.productName }}</li>
        }
      </ul>
      @if (order.notes) {
        <div class="notes">📝 {{ order.notes }}</div>
      }
    </ng-template>

    <app-modal [open]="rejecting() !== null" title="Reject Order" (close)="rejecting.set(null)">
      <div class="field">
        <label for="reject-reason">Reason</label>
        <input id="reject-reason" [(ngModel)]="rejectReason" name="rejectReason" placeholder="e.g. Item sold out" />
      </div>
      <button class="btn btn-primary btn-block" (click)="confirmReject()">Reject Order</button>
    </app-modal>
  `,
  styles: [`
    .board-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
    @media (max-width: 960px) { .board { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .board { grid-template-columns: 1fr; } }
    .column h2 { font-size: 15px; margin-bottom: 12px; border-radius: var(--radius-sm); transition: background .2s ease; }
    .column h2.flash { background: var(--color-subdued-pistachio); animation: flash-pulse 0.6s ease 3; }
    @keyframes flash-pulse { 0%, 100% { background: var(--color-subdued-pistachio); } 50% { background: var(--color-hero-sage); } }
    .order-card { padding: 14px; margin-bottom: 12px; }
    .card-top { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px; }
    .total { color: var(--color-text-chocolate); }
    .customer { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
    .pickup { font-size: 12px; color: var(--color-sage-700); margin-bottom: 6px; }
    .payment-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .payment { font-size: 12px; color: var(--color-text-muted); }
    .pay-status { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-pill); background: var(--color-subdued-pistachio); color: var(--color-status-closed); }
    .pay-status.paid { color: var(--color-status-open); }
    .mark-paid { width: 100%; margin-bottom: 10px; }
    .items { list-style: none; padding: 0; margin: 0 0 10px; font-size: 13px; }
    .notes { font-size: 12px; background: var(--color-subdued-pistachio); border-radius: var(--radius-sm); padding: 6px 8px; margin-bottom: 10px; }
    .actions { display: flex; flex-direction: column; gap: 8px; }
    .empty { color: var(--color-text-muted); font-size: 13px; }
  `],
})
export class AdminOrdersBoardComponent implements OnInit, OnDestroy {
  orderService = inject(AdminOrderService);
  private notifications = inject(NotificationService);
  private timer?: ReturnType<typeof setInterval>;

  rejecting = signal<AdminOrder | null>(null);
  rejectReason = '';
  flashNew = signal(false);

  private knownReceivedIds = new Set<string>();
  private firstLoad = true;
  private titleTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Fires whenever the orders signal updates (i.e. after every successful poll) — diff
    // against what we've already seen to detect genuinely new incoming orders.
    effect(() => {
      const current = this.orderService.received();
      const newOnes = this.firstLoad ? [] : current.filter(o => !this.knownReceivedIds.has(o.id));
      this.knownReceivedIds = new Set(current.map(o => o.id));
      this.firstLoad = false;

      if (newOnes.length) {
        this.playNewOrderAlert();
      }
    });
  }

  ngOnInit() {
    this.orderService.loadOrders();
    this.timer = setInterval(() => this.orderService.loadOrders(), POLL_MS);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.titleTimer) clearTimeout(this.titleTimer);
    document.title = ORIGINAL_TITLE;
  }

  advance(order: AdminOrder, status: 'PREPARING' | 'READY' | 'COMPLETED') {
    this.orderService.updateStatus(order.id, status).subscribe(updated => {
      if (updated) this.notifications.success(`Order #${order.id} moved to ${status}.`);
    });
  }

  markPaid(order: AdminOrder) {
    this.orderService.markPaid(order.id).subscribe(updated => {
      if (updated) this.notifications.success(`Order #${order.id} marked as paid.`);
    });
  }

  openReject(order: AdminOrder) {
    this.rejectReason = '';
    this.rejecting.set(order);
  }

  confirmReject() {
    const order = this.rejecting();
    if (!order) return;
    this.orderService.updateStatus(order.id, 'CANCELLED', this.rejectReason || undefined).subscribe(updated => {
      if (updated) this.notifications.info(`Order #${order.id} rejected.`);
    });
    this.rejecting.set(null);
  }

  private playNewOrderAlert() {
    this.flashNew.set(true);
    setTimeout(() => this.flashNew.set(false), 1800);

    document.title = '🔔 New Order! — Admin';
    if (this.titleTimer) clearTimeout(this.titleTimer);
    this.titleTimer = setTimeout(() => (document.title = ORIGINAL_TITLE), 4000);

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio can be blocked without a prior user gesture in some browsers — the visual/tab flash still lands.
    }
  }
}
