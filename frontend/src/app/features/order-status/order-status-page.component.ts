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
 */
@Component({
  selector: 'app-order-status-page',
  standalone: true,
  imports: [CommonModule, RouterLink, OrderStatusStepperComponent],
  template: `
    <section class="container status-page">
      @if (order()) {
        <div class="card">
          <h1>Order #{{ order()!.id }}</h1>
          @if (order()!.status === 'CANCELLED') {
            <p class="eta cancelled">This order was cancelled.{{ order()!.cancelReason ? ' Reason: ' + order()!.cancelReason : '' }}</p>
          } @else if (isDeliveryFailed(order()!)) {
            <p class="eta cancelled">Your delivery couldn't be completed. Please contact the store.</p>
          } @else {
            <app-order-status-stepper
              [status]="order()!.status"
              [fulfillmentType]="order()!.fulfillmentType"
              [deliveryStatus]="order()!.deliveryStatus"
            ></app-order-status-stepper>
            <p class="eta">{{ statusMessage() }}</p>
          }
          <a routerLink="/shop" class="btn btn-secondary btn-block">Back to Menu</a>

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
    .status-page { padding: 24px 16px 48px; max-width: 520px; }
    .card { padding: 24px; text-align: center; }
    .eta { margin: 20px 0; font-weight: 600; color: var(--color-text-chocolate); }
    .eta.cancelled { color: var(--color-status-closed); }
    .store-info {
      margin-top: 20px; padding-top: 16px; border-top: 1.5px dashed var(--color-subdued-pistachio);
      font-size: 13px; color: var(--color-text-muted);
    }
    .store-name { font-weight: 700; color: var(--color-text-chocolate); margin-bottom: 2px; }
    .store-info a { color: var(--color-sage-700); font-weight: 700; text-decoration: underline; }
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
}
