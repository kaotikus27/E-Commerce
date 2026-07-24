import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { CheckoutService } from '../../../core/services/checkout.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OrderRequest } from '../../../core/models/order.model';

type PaymentMethod = 'CARD' | 'CASH_ON_PICKUP';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
                @if (nameError()) { <span class="field-error">{{ nameError() }}</span> }
              </div>
              <div class="field">
                <label for="phone">Phone Number</label>
                <input id="phone" type="tel" [(ngModel)]="guestPhone" name="guestPhone" placeholder="(555) 123-4567" />
                @if (phoneError()) { <span class="field-error">{{ phoneError() }}</span> }
              </div>
              <div class="field">
                <label for="email">Email</label>
                <input id="email" type="email" [(ngModel)]="guestEmail" name="guestEmail" placeholder="jane@example.com" />
                @if (emailError()) { <span class="field-error">{{ emailError() }}</span> }
              </div>
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

          <!-- Step 3: Notes -->
          <div class="card step">
            <h3>3. Special Instructions</h3>
            <div class="field">
              <label for="notes">Notes for the kitchen (optional)</label>
              <textarea id="notes" [(ngModel)]="notes" name="notes" maxlength="150" rows="2" placeholder="e.g. Extra hot, nut allergy"></textarea>
              <span class="char-count">{{ notes.length }}/150</span>
            </div>
          </div>

          <!-- Step 4: Review -->
          <div class="card step">
            <h3>4. Order Review</h3>
            @if (cart.pickupTime()) {
              <p class="pickup-line"><strong>Pickup:</strong> {{ cart.pickupTime() }}</p>
            }
            @for (item of cart.items(); track item.id) {
              <div class="review-row">
                <span>{{ item.quantity }}× {{ item.product.name }}</span>
                <span>₱{{ item.lineTotal.toFixed(2) }}</span>
              </div>
            }
            <div class="review-row"><span>Subtotal</span><span>₱{{ cart.subtotal().toFixed(2) }}</span></div>
            <div class="review-row"><span>Tax</span><span>₱{{ cart.tax().toFixed(2) }}</span></div>
            <div class="review-row total"><span>Total</span><span>₱{{ cart.total().toFixed(2) }}</span></div>
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
    .char-count { font-size: 12px; color: var(--color-text-muted); align-self: flex-end; }
    .pickup-line { font-size: 14px; margin-bottom: 8px; }
    .review-row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; }
    .review-row.total { font-weight: 700; font-size: 16px; border-top: 1.5px dashed var(--color-pistachio); margin-top: 8px; padding-top: 8px; color: var(--color-espresso); }
    .error { color: var(--color-error); font-weight: 600; margin-bottom: 12px; }
    .field-error { color: var(--color-error); font-size: 12px; font-weight: 600; }
  `],
})
export class CheckoutPageComponent {
  cart = inject(CartService);
  checkout = inject(CheckoutService);
  auth = inject(AuthService);
  notifications = inject(NotificationService);
  router = inject(Router);

  private static readonly PHONE_PATTERN = /^[\d\s()+-]{7,20}$/;
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  guestName = '';
  guestPhone = '';
  guestEmail = '';
  paymentMethod: PaymentMethod = 'CARD';
  cardNumber = '';
  notes = '';
  submitting = signal(false);
  errorMessage = signal('');
  nameError = signal('');
  phoneError = signal('');
  emailError = signal('');

  /** Validates the guest contact fields, setting per-field inline errors. Returns true if valid. */
  private validateContactFields(): boolean {
    this.nameError.set('');
    this.phoneError.set('');
    this.emailError.set('');

    if (this.auth.isAuthenticated()) return true;

    let valid = true;
    if (!this.guestName.trim()) {
      this.nameError.set('Please enter your name.');
      valid = false;
    }
    if (!this.guestPhone.trim()) {
      this.phoneError.set('Please enter a phone number.');
      valid = false;
    } else if (!CheckoutPageComponent.PHONE_PATTERN.test(this.guestPhone.trim())) {
      this.phoneError.set('Please enter a valid phone number for pickup SMS.');
      valid = false;
    }
    if (this.guestEmail.trim() && !CheckoutPageComponent.EMAIL_PATTERN.test(this.guestEmail.trim())) {
      this.emailError.set('Please enter a valid email address.');
      valid = false;
    }
    return valid;
  }

  async submitOrder() {
    this.errorMessage.set('');

    if (!this.validateContactFields()) {
      this.errorMessage.set('Please fix the highlighted fields above.');
      return;
    }
    if (this.paymentMethod === 'CARD' && this.cardNumber.replace(/\s/g, '').length < 12) {
      this.errorMessage.set('Please enter a valid card number.');
      return;
    }
    if (!this.cart.pickupTime()) {
      this.errorMessage.set("Please select a pickup time — we're closed right now, or no slot was chosen.");
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
        guestEmail: this.guestEmail.trim() || undefined,
        pickupTime: this.cart.pickupTime(),
        paymentMethod: this.paymentMethod,
        items: this.cart.items(),
        subtotal: this.cart.subtotal(),
        tax: this.cart.tax(),
        total: this.cart.total(),
        notes: this.notes.trim() || undefined,
      };

      this.checkout.placeOrder(request).subscribe({
        next: order => {
          this.cart.clear();
          this.notifications.success('Order placed!');
          this.router.navigate(['/order-confirmation', order.id]);
          this.submitting.set(false);
        },
        error: () => {
          this.errorMessage.set('Could not place your order — the server may be unreachable. Please try again.');
          this.submitting.set(false);
        },
      });
    } catch {
      this.errorMessage.set('Something went wrong processing payment. Please try again.');
      this.submitting.set(false);
    }
  }
}
