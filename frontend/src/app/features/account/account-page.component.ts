import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CheckoutService } from '../../core/services/checkout.service';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="container account-page">
      <h1>My Account</h1>

      <div class="card section">
        <h3>Profile</h3>
        <p><strong>Name:</strong> {{ auth.user()?.name }}</p>
        <p><strong>Email:</strong> {{ auth.user()?.email }}</p>
        <button class="btn btn-secondary btn-sm">Reset Password</button>
      </div>

      <div class="card section">
        <h3>Order History</h3>
        @if (lastOrder()) {
          <div class="order-row">
            <span>#{{ lastOrder()!.id }}</span>
            <span>{{ lastOrder()!.status }}</span>
            <span>\${{ lastOrder()!.total.toFixed(2) }}</span>
          </div>
        } @else {
          <p class="muted">No past orders yet.</p>
        }
      </div>

      <div class="card section">
        <h3>Saved Addresses</h3>
        <p class="muted">No saved pickup preferences yet — this is a pickup-only bakery, so no delivery addresses are needed.</p>
      </div>

      <div class="card section">
        <h3>Wishlist</h3>
        <p class="muted">Tap the ♡ icon on any menu item to save it here.</p>
      </div>

      <button class="btn btn-secondary btn-block" (click)="auth.logout()">Log Out</button>
    </section>
  `,
  styles: [`
    .account-page { padding: 24px 16px 48px; max-width: 560px; }
    .section { padding: 20px; margin-bottom: 16px; }
    .muted { color: #6b6b6b; font-size: 14px; }
    .order-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; }
  `],
})
export class AccountPageComponent {
  auth = inject(AuthService);
  checkoutService = inject(CheckoutService);
  lastOrder = this.checkoutService.lastOrder;
}
