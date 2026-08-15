import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CheckoutService } from '../../../core/services/checkout.service';
import { Order } from '../../../core/models/order.model';
import { OrderStatusStepperComponent } from '../../../shared/components/order-status-stepper/order-status-stepper.component';
import { ChibiMascotComponent } from '../../../shared/components/chibi-mascot/chibi-mascot.component';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink, OrderStatusStepperComponent, ChibiMascotComponent],
  template: `
    <section class="container confirmation">
      @if (order()) {
        <div class="card receipt">
          <app-chibi-mascot [size]="80" label="Order confirmed mascot" class="mascot"></app-chibi-mascot>
          <h1>Order Confirmed!</h1>
          <p class="order-id">Order #{{ order()!.id }}</p>

          @if (order()!.status === 'CANCELLED') {
            <p class="cancelled-notice">This order was cancelled.{{ order()!.cancelReason ? ' Reason: ' + order()!.cancelReason : '' }}</p>
          } @else {
            <app-order-status-stepper
              [status]="order()!.status"
              [fulfillmentType]="order()!.fulfillmentType"
              [deliveryStatus]="order()!.deliveryStatus"
            ></app-order-status-stepper>
          }

          <div class="details">
            <p><strong>Pickup Time:</strong> {{ order()!.pickupTime }}</p>
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

          <div class="actions">
            <a [routerLink]="['/order-status', order()!.publicToken]" class="btn btn-primary btn-block">Track Order</a>
            <a routerLink="/shop" class="btn btn-secondary btn-block">Order More</a>
          </div>
        </div>
      } @else {
        <p>Order not found. <a routerLink="/shop">Back to menu</a></p>
      }
    </section>
  `,
  styles: [`
    .confirmation { padding: 24px 16px 48px; max-width: 560px; }
    .receipt { padding: 24px; text-align: center; }
    .mascot { margin: 0 auto 8px; }
    .order-id { color: var(--color-sage-700); font-weight: 700; margin-bottom: 20px; }
    .cancelled-notice { color: var(--color-status-closed); font-weight: 600; margin-bottom: 20px; }
    .pending-notice { color: var(--color-status-pending); font-weight: 600; font-size: 13px; }
    .details { text-align: left; margin: 20px 0; font-size: 14px; }
    .items { text-align: left; border-top: 1.5px dashed var(--color-subdued-pistachio); padding-top: 12px; margin-bottom: 20px; }
    .review-row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; }
    .review-row.total { font-weight: 700; font-size: 16px; margin-top: 8px; border-top: 1.5px dashed var(--color-subdued-pistachio); padding-top: 8px; }
    .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
  `],
})
export class OrderConfirmationComponent implements OnInit {
  route = inject(ActivatedRoute);
  checkoutService = inject(CheckoutService);
  order = signal<Order | null>(null);

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('id');
    const last = this.checkoutService.lastOrder();
    if (last && last.publicToken === token) {
      this.order.set(last);
    } else if (token) {
      this.checkoutService.getOrderStatus(token).subscribe(o => this.order.set(o ?? null));
    }
  }
}
