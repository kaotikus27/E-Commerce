import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { CheckoutService } from '../../../core/services/checkout.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OrderRequest } from '../../../core/models/order.model';

type PaymentMethod = 'CARD' | 'CASH_ON_PICKUP';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="container checkout-page">
      <h1>Checkout</h1>

      <div class="checkout-grid">
        <div class="checkout-form">
          <!-- Step 1: Contact -->
          <div class="card step">
            <h3>1. Contact Info</h3>
            @if (auth.isAuthenticated()) {
              <p>Ordering as <strong>{{ auth.user()?.name }}</strong> ({{ auth.user()?.email }})</p>
            } @else {
              <div class="field">
                <label for="name">Full Name</label>
                <input id="name" [(ngModel)]="guestName" name="guestName" placeholder="Jane Doe" />
              </div>
              <div class="field">
                <label for="phone">Phone Number</label>
                <input id="phone" [(ngModel)]="guestPhone" name="guestPhone" placeholder="(555) 123-4567" />
              </div>
              <p class="hint">Or <a routerLink="/login">log in</a> to use saved details.</p>
            }
          </div>

          <!-- Step 2: Payment -->
          <div class="card step">
            <h3>2. Payment Method</h3>
            <div class="payment-options">
              <label class="radio-row">
                <input type="radio" name="pay" value="CARD" [(ngModel)]="paymentMethod" />
                Credit / Debit Card
              </label>
              @if (paymentMethod === 'CARD') {
                <div class="field">
                  <label for="card">Card Number</label>
                  <input id="card" [(ngModel)]="cardNumber" name="cardNumber" placeholder="4242 4242 4242 4242" maxlength="19" />
                </div>
              }
              <label class="radio-row">
                <input type="radio" name="pay" value="CASH_ON_PICKUP" [(ngModel)]="paymentMethod" />
                Cash on Pickup
              </label>
            </div>
          </div>

          <!-- Step 3: Review -->
          <div class="card step">
            <h3>3. Order Review</h3>
            @for (item of cart.items(); track item.id) {
              <div class="review-row">
                <span>{{ item.quantity }}× {{ item.product.name }}</span>
                <span>\${{ item.lineTotal.toFixed(2) }}</span>
              </div>
            }
            <div class="review-row"><span>Subtotal</span><span>\${{ cart.subtotal().toFixed(2) }}</span></div>
            <div class="review-row"><span>Tax</span><span>\${{ cart.tax().toFixed(2) }}</span></div>
            <div class="review-row total"><span>Total</span><span>\${{ cart.total().toFixed(2) }}</span></div>
          </div>

          @if (errorMessage()) {
            <p class="error">{{ errorMessage() }}</p>
          }

          <button class="btn btn-primary btn-block" [disabled]="submitting()" (click)="submitOrder()">
            {{ submitting() ? 'Placing Order…' : 'Place Order' }}
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .checkout-page { padding: 24px 16px 48px; max-width: 640px; }
    .step { padding: 20px; margin-bottom: 16px; }
    .step h3 { margin-bottom: 12px; }
    .hint { font-size: 13px; }
    .hint a { color: var(--color-sage-700); font-weight: 700; text-decoration: underline; }
    .payment-options { display: flex; flex-direction: column; gap: 8px; }
    .radio-row { display: flex; align-items: center; gap: 8px; font-weight: 600; min-height: 44px; }
    .review-row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; }
    .review-row.total { font-weight: 700; font-size: 16px; border-top: 1.5px dashed var(--color-pistachio); margin-top: 8px; padding-top: 8px; color: var(--color-espresso); }
    .error { color: var(--color-error); font-weight: 600; margin-bottom: 12px; }
  `],
})
export class CheckoutPageComponent {
  cart = inject(CartService);
  checkout = inject(CheckoutService);
  auth = inject(AuthService);
  notifications = inject(NotificationService);
  router = inject(Router);

  guestName = '';
  guestPhone = '';
  paymentMethod: PaymentMethod = 'CARD';
  cardNumber = '';
  submitting = signal(false);
  errorMessage = signal('');

  async submitOrder() {
    this.errorMessage.set('');

    if (!this.auth.isAuthenticated() && (!this.guestName || !this.guestPhone)) {
      this.errorMessage.set('Please enter your name and phone number.');
      return;
    }
    if (this.paymentMethod === 'CARD' && this.cardNumber.replace(/\s/g, '').length < 12) {
      this.errorMessage.set('Please enter a valid card number.');
      return;
    }

    this.submitting.set(true);
    try {
      if (this.paymentMethod === 'CARD') {
        await this.checkout.tokenizePayment(this.cardNumber);
      }

      const request: OrderRequest = {
        guestName: this.auth.user()?.name ?? this.guestName,
        guestPhone: this.guestPhone,
        pickupTime: '15 minutes from now',
        paymentMethod: this.paymentMethod,
        items: this.cart.items(),
        subtotal: this.cart.subtotal(),
        tax: this.cart.tax(),
        total: this.cart.total(),
      };

      this.checkout.placeOrder(request).subscribe(order => {
        this.cart.clear();
        this.notifications.success('Order placed!');
        this.router.navigate(['/order-confirmation', order.id]);
        this.submitting.set(false);
      });
    } catch {
      this.errorMessage.set('Something went wrong processing payment. Please try again.');
      this.submitting.set(false);
    }
  }
}
