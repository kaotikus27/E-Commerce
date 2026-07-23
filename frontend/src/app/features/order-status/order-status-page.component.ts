import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CheckoutService } from '../../core/services/checkout.service';
import { Order, OrderStatus } from '../../core/models/order.model';
import { OrderStatusStepperComponent } from '../../shared/components/order-status-stepper/order-status-stepper.component';

const PROGRESSION: OrderStatus[] = ['RECEIVED', 'PREPARING', 'READY', 'COMPLETED'];

/**
 * Polls the backend for live status. In production this would subscribe to a
 * WebSocket/STOMP topic (e.g. /topic/orders/{id}) pushed by Spring Boot; here
 * we poll on an interval and, offline, simulate progression locally so the
 * demo experience is meaningful without the backend running.
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
          <app-order-status-stepper [status]="order()!.status"></app-order-status-stepper>
          <p class="eta">{{ statusMessage() }}</p>
          <a routerLink="/shop" class="btn btn-secondary btn-block">Back to Menu</a>
        </div>
      } @else {
        <p>Loading order status…</p>
      }
    </section>
  `,
  styles: [`
    .status-page { padding: 24px 16px 48px; max-width: 520px; }
    .card { padding: 24px; text-align: center; }
    .eta { margin: 20px 0; font-weight: 600; color: var(--color-espresso); }
  `],
})
export class OrderStatusPageComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  checkoutService = inject(CheckoutService);
  order = signal<Order | null>(null);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const last = this.checkoutService.lastOrder();
    if (last && last.id === id) this.order.set(last);

    if (id) {
      this.checkoutService.getOrderStatus(id).subscribe(o => { if (o) this.order.set(o); });
      this.timer = setInterval(() => this.advanceDemoStatus(), 6000);
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  statusMessage() {
    const messages: Record<OrderStatus, string> = {
      RECEIVED: 'We’ve got your order and are queuing it up.',
      PREPARING: 'Our bakers are baking/brewing your order now.',
      READY: 'Your order is ready for pickup!',
      COMPLETED: 'Order picked up. Enjoy!',
    };
    return messages[this.order()!.status];
  }

  private advanceDemoStatus() {
    const current = this.order();
    if (!current || current.status === 'COMPLETED') {
      if (this.timer) clearInterval(this.timer);
      return;
    }
    const nextIndex = PROGRESSION.indexOf(current.status) + 1;
    if (nextIndex < PROGRESSION.length) {
      this.order.set({ ...current, status: PROGRESSION[nextIndex] });
    }
  }
}
