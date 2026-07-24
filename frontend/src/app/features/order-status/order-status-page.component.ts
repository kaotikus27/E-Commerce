import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CheckoutService } from '../../core/services/checkout.service';
import { StoreService } from '../../core/services/store.service';
import { Order, OrderStatus } from '../../core/models/order.model';
import { OrderStatusStepperComponent } from '../../shared/components/order-status-stepper/order-status-stepper.component';

const POLL_MS = 6000;

/**
 * Polls the backend for live status on an interval so the customer sees the real
 * progression as staff work the order through the admin Live Orders board. In
 * production this would instead subscribe to a WebSocket/STOMP push from Spring Boot.
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
          } @else {
            <app-order-status-stepper [status]="order()!.status"></app-order-status-stepper>
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
  private timer?: ReturnType<typeof setInterval>;

  private orderId: string | null = null;

  ngOnInit() {
    this.orderId = this.route.snapshot.paramMap.get('id');
    const last = this.checkoutService.lastOrder();
    if (last && last.id === this.orderId) this.order.set(last);

    if (this.orderId) {
      this.pollStatus();
      this.timer = setInterval(() => this.pollStatus(), POLL_MS);
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private pollStatus() {
    if (!this.orderId) return;
    this.checkoutService.getOrderStatus(this.orderId).subscribe(o => {
      if (!o) return;
      this.order.set(o);
      if ((o.status === 'COMPLETED' || o.status === 'CANCELLED') && this.timer) {
        clearInterval(this.timer);
      }
    });
  }

  statusMessage() {
    const messages: Record<OrderStatus, string> = {
      RECEIVED: 'Order received! We’ve got it and are queuing it up.',
      PREPARING: 'Our bakers are baking/brewing your order now.',
      READY: 'Your order is ready for pickup!',
      COMPLETED: 'Order picked up. Enjoy!',
      CANCELLED: 'This order was cancelled.',
    };
    return messages[this.order()!.status];
  }
}
