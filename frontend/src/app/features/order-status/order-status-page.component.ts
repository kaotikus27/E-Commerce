import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { CheckoutService } from '../../core/services/checkout.service';
import { StoreService } from '../../core/services/store.service';
import { Order } from '../../core/models/order.model';
import { OrderStatusStepperComponent } from '../../shared/components/order-status-stepper/order-status-stepper.component';

const POLL_MS = 6000;

/**
 * Polls the backend for live status on an interval so the customer sees the real
 * progression as staff work the order through the admin Live Orders board. In
 * production this would instead subscribe to a WebSocket/STOMP push from Spring Boot.
 *
 * Uses timer + switchMap rather than setInterval: switchMap drops a still-in-flight
 * request if the next tick fires before it resolves, and takeWhile stops the polling
 * subscription itself once the order reaches a terminal state, instead of manually
 * clearing an interval from inside the response handler.
 *
 * This is now the SOLE post-checkout destination — checkout used to detour through a
 * one-time static "order-confirmation" snapshot first, requiring a second click through
 * to reach this actually-live page. That page's unique content (items/total, payment
 * method, notes) is folded in below; its own component has been retired.
 */
@Component({
  selector: 'app-order-status-page',
  standalone: true,
  imports: [CommonModule, RouterLink, OrderStatusStepperComponent],
  template: `
    <section class="container status-page">
      @if (order()) {
        <div class="card">
          @if (paymentPill()) {
            <span class="pill" [class]="paymentPill()!.tone">{{ paymentPill()!.label }}</span>
          }
          <h1>{{ pageTitle() }}</h1>
          <p class="order-id">Order Reference: #{{ order()!.id }}</p>

          @if (order()!.status === 'CANCELLED') {
            <p class="eta cancelled">This order was cancelled.{{ order()!.cancelReason ? ' Reason: ' + order()!.cancelReason : '' }}</p>
          } @else if (isDeliveryFailed(order()!)) {
            <p class="eta cancelled">Your delivery couldn't be completed. Please contact the store.</p>
          } @else {
            @if (order()!.fulfillmentType === 'DELIVERY' && order()!.driverName) {
              <div class="rider-box">
                <p class="rider-name">🛵 {{ order()!.driverName }}{{ order()!.driverPlateNumber ? ' · ' + order()!.driverPlateNumber : '' }} is on your delivery.</p>
                @if (order()!.trackingShareLink) {
                  <a [href]="order()!.trackingShareLink" target="_blank" rel="noopener">Track your rider live →</a>
                }
              </div>
            }
            <app-order-status-stepper
              [status]="order()!.status"
              [fulfillmentType]="order()!.fulfillmentType"
              [deliveryStatus]="order()!.deliveryStatus"
            ></app-order-status-stepper>
            <p class="eta">{{ statusMessage() }}</p>
          }

          <div class="details">
            <p><strong>{{ order()!.fulfillmentType === 'DELIVERY' ? 'Ready by' : 'Pickup Time' }}:</strong> {{ order()!.pickupTime }}</p>
            <p><strong>Payment:</strong> {{ order()!.paymentMethod === 'GCASH_MANUAL' ? 'GCash' : 'Cash on Pickup' }}</p>
            @if (order()!.paymentStatus === 'PENDING_VERIFICATION') {
              <p class="pending-notice">We're verifying your GCash payment — you'll see this update once it's confirmed.</p>
            }
            @if (order()!.notes) {
              <p><strong>Notes:</strong> {{ order()!.notes }}</p>
            }
          </div>

          <div class="items">
            @for (item of order()!.items; track item.productId) {
              <div class="review-row">
                <span>{{ item.quantity }}× {{ item.productName }}</span>
                <span>₱{{ item.lineTotal.toFixed(2) }}</span>
              </div>
            }
            <div class="review-row total"><span>Total</span><span>₱{{ order()!.total.toFixed(2) }}</span></div>
          </div>

          <a routerLink="/shop" class="btn place-order-btn btn-block">🥐 Order Something Else</a>
          <a routerLink="/contact" class="help-link">Need Help with Your Order?</a>

          <div class="store-info">
            <p class="store-name">{{ store.name() }}</p>
            <p>{{ store.address() }}</p>
            <a [href]="store.mapUrl()" target="_blank" rel="noopener">Get Directions →</a>
          </div>
        </div>
      } @else {
        <p>Loading order status…</p>
      }
    </section>
  `,
  styles: [`
    /* Bespoke palette matching the item-modal/cart-drawer/checkout redesign (DEC-030) — not
       the site's global tokens: Parchment Cream card fill, Warm Oak borders/body text,
       Forest Sage headings/accents, Spirit Orange primary CTA. */
    .status-page { padding: 24px 16px 48px; max-width: 560px; }
    .card {
      padding: 28px 24px; text-align: center; background: #F7F3E9;
      border: 1.5px solid #6F4E37; border-radius: var(--radius-lg);
    }
    .pill {
      display: inline-block; padding: 4px 14px; border-radius: var(--radius-pill);
      font-size: 12px; font-weight: 700; margin-bottom: 12px;
    }
    .pill.confirmed { background: #E4EFE6; color: #2E4A3B; }
    .pill.pending { background: #FBEFD9; color: #8A6317; }
    .pill.neutral { background: #F0E9DC; color: #6F4E37; }
    .pill.failed { background: #F7DEDA; color: var(--color-error); }
    h1 { color: #2E4A3B; margin: 4px 0; }
    .order-id { color: #6F4E37; font-weight: 700; margin-bottom: 16px; font-size: 13px; }
    .rider-box {
      background: #FDFBF7; border: 1.5px dashed #D96B43; border-radius: var(--radius-sm);
      padding: 12px 16px; margin-bottom: 16px; text-align: left; font-size: 13px;
    }
    .rider-name { font-weight: 700; color: #2E4A3B; margin: 0 0 4px; }
    .rider-box a { color: #D96B43; font-weight: 700; text-decoration: underline; }
    .eta { margin: 16px 0; font-weight: 600; color: #6F4E37; }
    .eta.cancelled { color: var(--color-status-closed); }
    .pending-notice { color: var(--color-status-pending); font-weight: 600; font-size: 13px; }
    .details { text-align: left; margin: 20px 0; font-size: 14px; color: #6F4E37; }
    .items { text-align: left; border-top: 1.5px dashed #D4C3A3; padding-top: 12px; margin-bottom: 20px; }
    .review-row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; color: #6F4E37; }
    .review-row.total { font-weight: 700; font-size: 16px; margin-top: 8px; border-top: 1.5px dashed #D4C3A3; padding-top: 8px; color: #2E4A3B; }
    .place-order-btn { background: #D96B43; color: var(--color-white); border: none; font-size: 16px; margin-top: 4px; }
    .place-order-btn:hover { background: #c15a35; }
    .help-link { display: block; text-align: center; margin-top: 12px; color: #6F4E37; font-weight: 600; text-decoration: underline; font-size: 13px; }
    .store-info {
      margin-top: 20px; padding-top: 16px; border-top: 1.5px dashed #D4C3A3;
      font-size: 13px; color: #6F4E37;
    }
    .store-name { font-weight: 700; color: #2E4A3B; margin-bottom: 2px; }
    .store-info a { color: #D96B43; font-weight: 700; text-decoration: underline; }
  `],
})
export class OrderStatusPageComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  checkoutService = inject(CheckoutService);
  store = inject(StoreService);
  order = signal<Order | null>(null);
  private pollSub?: Subscription;

  private publicToken: string | null = null;

  ngOnInit() {
    this.publicToken = this.route.snapshot.paramMap.get('id');
    const last = this.checkoutService.lastOrder();
    if (last && last.publicToken === this.publicToken) this.order.set(last);

    if (this.publicToken) {
      const token = this.publicToken;
      this.pollSub = timer(0, POLL_MS).pipe(
        switchMap(() => this.checkoutService.getOrderStatus(token)),
        takeWhile(o => !o || (o.status !== 'COMPLETED' && o.status !== 'CANCELLED'), true)
      ).subscribe(o => {
        if (o) this.order.set(o);
      });
    }
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  /** A Lalamove delivery can fail outright (rejected/canceled on their side) without the order
   *  itself ever being marked CANCELLED — nothing today auto-cancels the order to match, so this
   *  is the one case the stepper can't represent as a forward step. */
  isDeliveryFailed(order: Order): boolean {
    return order.fulfillmentType === 'DELIVERY'
      && (order.deliveryStatus === 'REJECTED' || order.deliveryStatus === 'CANCELED');
  }

  /** Short headline for the big title — separate from statusMessage()'s more granular,
   *  payment-aware subline underneath. */
  pageTitle(): string {
    const order = this.order()!;
    if (order.status === 'CANCELLED') return 'Order Cancelled';
    if (this.isDeliveryFailed(order)) return 'Delivery Issue';
    const isDelivery = order.fulfillmentType === 'DELIVERY';
    switch (order.status) {
      case 'RECEIVED': return 'Order Received!';
      case 'PREPARING': return 'Preparing Your Order!';
      case 'READY': return isDelivery ? 'Out for Delivery!' : 'Ready for Pickup!';
      case 'COMPLETED': return isDelivery ? 'Delivered!' : 'Order Complete!';
      default: return 'Order Status';
    }
  }

  /** Context-aware message — combines fulfillment status with payment status so a customer
   *  waiting on GCash verification isn't left wondering why nothing seems to be happening. */
  statusMessage() {
    const order = this.order()!;
    const isDelivery = order.fulfillmentType === 'DELIVERY';

    if (order.status === 'RECEIVED') {
      if (order.paymentStatus === 'PENDING_VERIFICATION') {
        return "We're verifying your GCash payment. Please hang tight!";
      }
      if (order.paymentStatus === 'UNPAID') {
        return 'Order received! Please prepare exact cash on pickup.';
      }
      return 'Payment confirmed! Queueing your order for preparation.';
    }
    if (order.status === 'PREPARING') return 'Our bakers are baking/brewing your order now.';
    if (order.status === 'READY') {
      if (!isDelivery) return 'Your order is ready! Pick up at the counter.';
      return order.deliveryStatus === 'PICKED_UP'
        ? 'Your rider has your order and is on the way!'
        : 'A rider has been assigned to your order.';
    }
    if (order.status === 'COMPLETED') return isDelivery ? 'Order delivered. Enjoy!' : 'Order picked up. Enjoy!';
    return '';
  }

  /** Small badge under the title — a quick-glance payment signal distinct from the more
   *  detailed payment-method/pending-notice lines further down. */
  paymentPill(): { label: string; tone: string } | null {
    const order = this.order()!;
    switch (order.paymentStatus) {
      case 'PAID': return { label: '✓ Payment Confirmed', tone: 'confirmed' };
      case 'PENDING_VERIFICATION': return { label: 'Verifying Payment', tone: 'pending' };
      case 'UNPAID': return { label: 'Cash on Pickup', tone: 'neutral' };
      case 'FAILED': return { label: 'Payment Failed', tone: 'failed' };
      case 'REFUNDED': return { label: 'Refunded', tone: 'neutral' };
      default: return null;
    }
  }
}
