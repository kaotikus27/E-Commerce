import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, switchMap, timer } from 'rxjs';
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
              @if (order.paymentStatus === 'PENDING_VERIFICATION') {
                <button class="btn btn-primary btn-sm" [disabled]="!canVerify(order)" (click)="verifyAndAccept(order)">Verify &amp; Accept</button>
                <button class="btn btn-secondary btn-sm" (click)="openReject(order)">Reject Payment</button>
              } @else {
                <button class="btn btn-primary btn-sm" (click)="advance(order, 'PREPARING')">Accept Order</button>
                <button class="btn btn-secondary btn-sm" (click)="openReject(order)">Reject</button>
              }
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
              @if (order.fulfillmentType === 'DELIVERY' && order.deliveryStatus === 'NOT_DISPATCHED') {
                <button class="btn btn-secondary btn-sm" [disabled]="dispatching().has(order.id)" (click)="dispatchDelivery(order)">
                  {{ dispatching().has(order.id) ? 'Calling Rider…' : '🛵 Call Lalamove Rider' }}
                </button>
              }
              @if (order.fulfillmentType === 'DELIVERY' && !canMarkReady(order)) {
                <div class="ready-hint">Waiting for a Lalamove driver to be assigned before this can be marked ready.</div>
              }
              <button class="btn btn-primary btn-sm" [disabled]="!canMarkReady(order)" (click)="advance(order, 'READY')">Mark Ready</button>
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
              @if (order.fulfillmentType === 'DELIVERY' && order.deliveryStatus === 'NOT_DISPATCHED') {
                <button class="btn btn-secondary btn-sm" [disabled]="dispatching().has(order.id)" (click)="dispatchDelivery(order)">
                  {{ dispatching().has(order.id) ? 'Calling Rider…' : '🛵 Call Lalamove Rider' }}
                </button>
              }
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
      <div class="pickup">{{ order.fulfillmentType === 'DELIVERY' ? 'Ready by' : 'Pickup' }}: {{ order.pickupTime }}</div>
      @if (order.fulfillmentType === 'DELIVERY') {
        <div class="delivery-info">
          🛵 Deliver to: <strong>{{ order.deliveryAddress }}</strong> — Fee: ₱{{ (order.deliveryFee ?? 0).toFixed(2) }}
          @if (order.deliveryUnitDetails) {
            <div class="delivery-unit-details">📍 Rider instructions: <strong>{{ order.deliveryUnitDetails }}</strong></div>
          }
          @if (order.deliveryStatus !== 'NOT_DISPATCHED') {
            <div class="delivery-status-badge">🛵 {{ order.deliveryStatus }}</div>
            @if (order.driverName) {
              <div class="driver-info">Driver: <strong>{{ order.driverName }}</strong> · {{ order.driverPhone }} @if (order.driverPlateNumber) { · {{ order.driverPlateNumber }} }</div>
            }
            @if (order.trackingShareLink) {
              <a [href]="order.trackingShareLink" target="_blank" rel="noopener" class="tracking-link">📍 Track Rider Live</a>
            }
            @if (isDeliveryInProgress(order)) {
              <button class="btn btn-secondary btn-sm sync-delivery-btn" [disabled]="syncing().has(order.id)" (click)="syncDeliveryStatus(order)">
                {{ syncing().has(order.id) ? 'Syncing…' : '🔄 Refresh Delivery Status' }}
              </button>
            }
          }
        </div>
      }
      <div class="payment-row">
        <span class="payment">{{ order.paymentMethod === 'GCASH_MANUAL' ? 'GCash' : 'Cash on Pickup' }}</span>
        <span class="pay-status" [class.paid]="order.paymentStatus === 'PAID'" [class.pending]="order.paymentStatus === 'PENDING_VERIFICATION'">{{ order.paymentStatus }}</span>
      </div>
      @if (order.paymentStatus === 'PENDING_VERIFICATION') {
        <div class="field ref-field">
          <label [for]="'ref-' + order.id">Reference # to verify</label>
          <input [id]="'ref-' + order.id" [ngModel]="getEditedRef(order)" (ngModelChange)="setEditedRef(order, $event)" name="ref-{{ order.id }}" />
        </div>
        @if (order.ocrExtractedRef) {
          <div class="ocr-badge" [class.mismatch]="!canVerify(order)">
            OCR read: <strong>{{ order.ocrExtractedRef }}</strong>
            @if (!canVerify(order)) { — doesn't match, correct the field above to enable Verify & Accept }
          </div>
        } @else {
          <div class="ocr-badge ocr-unavailable">⚠️ OCR unavailable — cross-check against the receipt image before verifying.</div>
        }
      } @else if (order.gcashReference) {
        <div class="gcash-ref">Ref #: <strong>{{ order.gcashReference }}</strong></div>
      }
      @if (order.receiptImagePath) {
        @if (receiptImageUrl(order); as url) {
          <a [href]="url" target="_blank" rel="noopener" class="receipt-thumb-link">
            <img [src]="url" alt="Uploaded GCash receipt" class="receipt-thumb" />
          </a>
        } @else {
          <div class="receipt-thumb receipt-thumb-loading">Loading receipt…</div>
        }
      }
      @if (order.paymentStatus === 'PENDING_VERIFICATION') {
        <div class="field receipt-upload">
          <label [for]="'receipt-' + order.id">{{ order.receiptImagePath ? 'Replace receipt image' : 'Upload receipt image' }}</label>
          <input [id]="'receipt-' + order.id" type="file" accept="image/*" (change)="onReceiptFileSelected(order, $event)" />
        </div>
      }
      @if (order.paymentStatus === 'UNPAID' && order.paymentMethod === 'CASH_ON_PICKUP') {
        <button class="btn btn-secondary btn-sm mark-paid" (click)="markPaid(order)">Mark as Paid</button>
      }
      <ul class="items">
        @for (item of order.items; track item.productId) {
          <li>{{ item.quantity }}× {{ item.productName }}{{ item.giftWrap ? ' 🎁' : '' }}</li>
        }
      </ul>
      @if (order.notes) {
        <div class="notes">📝 {{ order.notes }}</div>
      }
    </ng-template>

    <app-modal [open]="rejecting() !== null" [title]="rejecting()?.paymentStatus === 'PENDING_VERIFICATION' ? 'Reject Payment' : 'Reject Order'" (close)="rejecting.set(null)">
      <div class="field">
        <label for="reject-reason">Reason</label>
        <input id="reject-reason" [(ngModel)]="rejectReason" name="rejectReason" placeholder="e.g. Item sold out, payment not received" />
      </div>
      <button class="btn btn-primary btn-block" (click)="confirmReject()">
        {{ rejecting()?.paymentStatus === 'PENDING_VERIFICATION' ? 'Reject Payment' : 'Reject Order' }}
      </button>
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
    .delivery-info { font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px; }
    .delivery-unit-details { margin-top: 4px; color: var(--color-status-pending); }
    .delivery-status-badge { margin-top: 6px; font-weight: 700; color: var(--color-sage-700); }
    .driver-info { margin-top: 2px; font-size: 12px; }
    .tracking-link { display: inline-block; margin-top: 4px; font-size: 12px; font-weight: 700; color: var(--color-sage-700); text-decoration: underline; }
    .sync-delivery-btn { display: block; margin-top: 6px; }
    .payment-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .payment { font-size: 12px; color: var(--color-text-muted); }
    .pay-status { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-pill); background: var(--color-subdued-pistachio); color: var(--color-status-closed); }
    .pay-status.paid { color: var(--color-status-open); }
    .pay-status.pending { color: var(--color-status-pending); }
    .gcash-ref { font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px; }
    .ref-field { margin-bottom: 8px; }
    .ref-field label { font-size: 12px; }
    .ocr-badge { font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px; }
    .ocr-badge.mismatch { color: var(--color-status-closed); font-weight: 600; }
    .ocr-badge.ocr-unavailable { color: var(--color-status-pending); font-weight: 600; }
    .receipt-thumb-link { display: block; margin-bottom: 8px; }
    .receipt-thumb { display: block; width: 100%; max-height: 160px; object-fit: cover; border-radius: var(--radius-sm); border: 1.5px solid var(--color-subdued-pistachio); }
    .receipt-thumb-loading { display: flex; align-items: center; justify-content: center; height: 60px; font-size: 12px; color: var(--color-text-muted); background: var(--color-subdued-pistachio); border-radius: var(--radius-sm); margin-bottom: 8px; }
    .receipt-upload { margin-bottom: 8px; }
    .receipt-upload label { font-size: 12px; }
    .mark-paid { width: 100%; margin-bottom: 10px; }
    .items { list-style: none; padding: 0; margin: 0 0 10px; font-size: 13px; }
    .notes { font-size: 12px; background: var(--color-subdued-pistachio); border-radius: var(--radius-sm); padding: 6px 8px; margin-bottom: 10px; }
    .actions { display: flex; flex-direction: column; gap: 8px; }
    .ready-hint { font-size: 12px; color: var(--color-status-pending); }
    .empty { color: var(--color-text-muted); font-size: 13px; }
  `],
})
export class AdminOrdersBoardComponent implements OnInit, OnDestroy {
  orderService = inject(AdminOrderService);
  private notifications = inject(NotificationService);
  private pollSub?: Subscription;

  rejecting = signal<AdminOrder | null>(null);
  rejectReason = '';
  flashNew = signal(false);

  /** Admin's in-progress edits to a GCash order's reference number, keyed by order id — seeded
   *  from the customer-typed/OCR-fallback value the first time each order is seen, so re-polling
   *  doesn't clobber whatever the admin is mid-typing. */
  editedRefs = signal<Record<string, string>>({});

  /** Order ids currently mid-dispatch — disables the "Call Rider" button to prevent double-clicks. */
  dispatching = signal<Set<string>>(new Set());

  /** Order ids currently mid-sync — disables the "Refresh Delivery Status" button to prevent double-clicks. */
  syncing = signal<Set<string>>(new Set());

  private knownReceivedIds = new Set<string>();
  private seededRefIds = new Set<string>();
  private firstLoad = true;
  private titleTimer?: ReturnType<typeof setTimeout>;

  /** Object URLs for receipt images, keyed by order id — populated by fetchMissingReceiptImages()
   *  since receipts now come from an authenticated endpoint, not a plain public <img src>. */
  private receiptImageUrls = signal<Record<string, string>>({});
  /** "orderId:receiptImagePath" keys already fetched or in flight, so re-polling doesn't
   *  re-fetch a receipt that hasn't changed, and a replaced receipt (new path) does. */
  private fetchedReceiptKeys = new Set<string>();

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

      for (const order of current) {
        if (order.paymentStatus === 'PENDING_VERIFICATION' && !this.seededRefIds.has(order.id)) {
          this.seededRefIds.add(order.id);
          this.editedRefs.update(m => ({ ...m, [order.id]: order.gcashReference ?? '' }));
        }
      }
    }, { allowSignalWrites: true });

    // Runs across every column (not just received()) — a GCash receipt stays visible on a
    // card as it moves through Preparing/Ready/Completed, so it has to keep being fetchable.
    effect(() => {
      this.fetchMissingReceiptImages(this.orderService.orders());
    }, { allowSignalWrites: true });
  }

  private fetchMissingReceiptImages(orders: AdminOrder[]) {
    for (const order of orders) {
      if (!order.receiptImagePath) continue;
      const key = `${order.id}:${order.receiptImagePath}`;
      if (this.fetchedReceiptKeys.has(key)) continue;
      this.fetchedReceiptKeys.add(key);

      this.orderService.getReceiptImageBlob(order.id).subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const previous = this.receiptImageUrls()[order.id];
          if (previous) URL.revokeObjectURL(previous);
          this.receiptImageUrls.update(m => ({ ...m, [order.id]: url }));
        },
        error: () => this.fetchedReceiptKeys.delete(key),
      });
    }
  }

  receiptImageUrl(order: AdminOrder): string | null {
    return this.receiptImageUrls()[order.id] ?? null;
  }

  getEditedRef(order: AdminOrder): string {
    return this.editedRefs()[order.id] ?? order.gcashReference ?? '';
  }

  setEditedRef(order: AdminOrder, value: string) {
    this.editedRefs.update(m => ({ ...m, [order.id]: value }));
  }

  /** OCR unavailable (no native Tesseract, blurry image, etc.) falls back to trusting the admin's
   *  manual entry rather than permanently blocking verification — otherwise an OCR outage would
   *  freeze all GCash order fulfillment. */
  canVerify(order: AdminOrder): boolean {
    if (!order.ocrExtractedRef) return true;
    return this.getEditedRef(order).trim() === order.ocrExtractedRef.trim();
  }

  ngOnInit() {
    // timer(0, POLL_MS) fires immediately then every POLL_MS after, covering both the
    // initial load and the recurring poll in one subscription. switchMap drops a still-
    // in-flight request if the next tick fires before it resolves, instead of letting
    // requests pile up the way the previous setInterval-based polling could.
    this.pollSub = timer(0, POLL_MS).pipe(
      switchMap(() => this.orderService.fetchOrders())
    ).subscribe();
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    if (this.titleTimer) clearTimeout(this.titleTimer);
    document.title = ORIGINAL_TITLE;
    for (const url of Object.values(this.receiptImageUrls())) URL.revokeObjectURL(url);
  }

  /** Pickup orders can always be marked ready. Delivery orders need a rider actually assigned
   *  first — Lalamove has no distinct "ASSIGNED" order status (their real states are
   *  ASSIGNING_DRIVER → ON_GOING → PICKED_UP → COMPLETED, per their webhook docs); a driver
   *  being assigned is signaled by the separate DRIVER_ASSIGNED webhook populating driverName
   *  while the order can still show ASSIGNING_DRIVER overall, or by deliveryStatus already
   *  having advanced to ON_GOING/PICKED_UP. Either is treated as "a rider is coming." */
  canMarkReady(order: AdminOrder): boolean {
    if (order.fulfillmentType !== 'DELIVERY') return true;
    return !!order.driverName || order.deliveryStatus === 'ON_GOING' || order.deliveryStatus === 'PICKED_UP';
  }

  advance(order: AdminOrder, status: 'PREPARING' | 'READY' | 'COMPLETED') {
    this.orderService.updateStatus(order.id, status).subscribe(updated => {
      if (updated) this.notifications.success(`Order #${order.id} moved to ${status}.`);
    });
  }

  verifyAndAccept(order: AdminOrder) {
    const confirmedReference = this.getEditedRef(order).trim() || undefined;
    this.orderService.verifyAndAcceptPayment(order.id, confirmedReference).subscribe(updated => {
      if (updated) this.notifications.success(`Order #${order.id} payment verified — sent to kitchen.`);
    });
  }

  onReceiptFileSelected(order: AdminOrder, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.orderService.uploadReceipt(order.id, file).subscribe(updated => {
      if (updated) this.notifications.success(`Order #${order.id} receipt image updated.`);
    });
  }

  dispatchDelivery(order: AdminOrder) {
    this.dispatching.update(set => new Set(set).add(order.id));
    this.orderService.dispatchDelivery(order.id).subscribe(updated => {
      this.dispatching.update(set => {
        const next = new Set(set);
        next.delete(order.id);
        return next;
      });
      if (updated) this.notifications.success(`Order #${order.id} dispatched to Lalamove.`);
    });
  }

  /** Only worth offering once dispatched and not yet finished — a terminal delivery status
   *  (COMPLETED/REJECTED/CANCELED) is locked server-side and a sync would be a guaranteed no-op. */
  isDeliveryInProgress(order: AdminOrder): boolean {
    return order.deliveryStatus !== 'NOT_DISPATCHED'
      && order.deliveryStatus !== 'COMPLETED'
      && order.deliveryStatus !== 'REJECTED'
      && order.deliveryStatus !== 'CANCELED';
  }

  syncDeliveryStatus(order: AdminOrder) {
    this.syncing.update(set => new Set(set).add(order.id));
    this.orderService.syncDeliveryStatus(order.id).subscribe(updated => {
      this.syncing.update(set => {
        const next = new Set(set);
        next.delete(order.id);
        return next;
      });
      if (updated) this.notifications.success(`Order #${order.id} delivery status refreshed.`);
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
