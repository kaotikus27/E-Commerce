import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CheckoutService } from '../../core/services/checkout.service';
import { RecentOrdersService } from '../../core/services/recent-orders.service';

/**
 * "I lost my link" entry point for a guest who closed their confirmation tab. Deliberately
 * two explicit required fields (order number + phone), not one smart input accepting either —
 * a bare order number is documented on the backend as deliberately guessable and must never be
 * a standalone lookup key on its own (see OrderService.lookupOrder / OrderLookupRequestDto).
 */
@Component({
  selector: 'app-track-order-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="container track-page">
      <div class="track-grid">
        <div class="illustration-panel">
          <img src="assets/track-order/kitchen.jpg" alt="A cozy kitchen preparing fresh food" />
          <h2>Track Your Order in Real-Time</h2>
          <p>Once you find your order, follow every step — from prep to your door — live.</p>
        </div>

        <div class="search-card">
          <span class="eyebrow">Home Cafe by Bami</span>
          <h1>Find Your Order</h1>
          <p class="subtitle">Lost your tracking link? Enter your order number and mobile number below.</p>

          @if (recentOrders.mostRecent(); as entry) {
            <div class="recall-banner">
              <div>
                <strong>Active Order Found</strong>
                <p>Order #{{ entry.orderNumber }} in progress</p>
              </div>
              <a [routerLink]="['/order-status', entry.publicToken]" class="btn btn-sm view-status-btn">View Status</a>
            </div>
          }

          <form (ngSubmit)="submit()">
            <label for="order-number">Order Number</label>
            <input id="order-number" [(ngModel)]="orderNumber" name="orderNumber" placeholder="e.g. ORD-336213" autocomplete="off" />

            <label for="guest-phone">Mobile Number</label>
            <input id="guest-phone" [(ngModel)]="guestPhone" name="guestPhone" type="tel" placeholder="e.g. 0912 345 6789" autocomplete="tel" />

            @if (errorMessage()) {
              <p class="field-error">{{ errorMessage() }}</p>
            }

            <button type="submit" class="btn track-btn btn-block" [disabled]="submitting() || !canSubmit()">
              {{ submitting() ? 'Searching…' : '🔍 Track Order' }}
            </button>
          </form>

          <a routerLink="/contact" class="help-link">Can't find your receipt? Contact Us</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Bespoke palette matching the item-modal/cart-drawer/checkout/order-status redesign
       (DEC-030) — Parchment Cream card fill, Warm Oak borders/body text, Forest Sage headings,
       Spirit Orange primary CTA. */
    .track-page { padding: 24px 16px 48px; max-width: 980px; }
    .track-grid { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; }
    @media (min-width: 900px) { .track-grid { grid-template-columns: 1fr 1fr; } }

    .illustration-panel { display: none; }
    @media (min-width: 900px) {
      .illustration-panel {
        display: block; background: #F7F3E9; border: 1.5px solid #6F4E37;
        border-radius: var(--radius-lg); padding: 20px; text-align: center;
      }
      .illustration-panel img { width: 100%; border-radius: var(--radius-md); margin-bottom: 16px; object-fit: cover; max-height: 320px; }
      .illustration-panel h2 { color: #2E4A3B; margin: 0 0 8px; }
      .illustration-panel p { color: #6F4E37; font-size: 14px; margin: 0; }
    }

    .search-card {
      background: #F7F3E9; border: 1.5px solid #6F4E37; border-radius: var(--radius-lg);
      padding: 24px;
    }
    .eyebrow {
      display: inline-block; background: #FBEFD9; color: #D96B43; font-weight: 700;
      font-size: 12px; padding: 4px 12px; border-radius: var(--radius-pill); margin-bottom: 10px;
    }
    h1 { color: #2E4A3B; margin: 4px 0 8px; }
    .subtitle { color: #6F4E37; font-size: 14px; margin: 0 0 16px; }

    .recall-banner {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: #FDFBF7; border: 1.5px dashed #D96B43; border-radius: var(--radius-sm);
      padding: 12px 16px; margin-bottom: 18px;
    }
    .recall-banner strong { color: #2E4A3B; font-size: 13px; }
    .recall-banner p { margin: 2px 0 0; font-size: 13px; color: #6F4E37; }
    .view-status-btn { background: var(--color-white); border: 1.5px solid #2E4A3B; color: #2E4A3B; white-space: nowrap; }

    form label { display: block; font-size: 13px; font-weight: 700; color: #2E4A3B; margin-bottom: 6px; }
    form input {
      width: 100%; background: #FDFBF7; border: 1.5px solid #D4C3A3; border-radius: var(--radius-sm);
      padding: 10px 14px; font-size: 16px; min-height: 44px; margin-bottom: 14px;
    }
    .field-error { color: var(--color-error); font-size: 13px; font-weight: 600; margin: -6px 0 12px; }
    .track-btn { background: #D96B43; color: var(--color-white); border: none; font-size: 16px; }
    .track-btn:hover:not(:disabled) { background: #c15a35; }
    .help-link { display: block; text-align: center; margin-top: 14px; color: #6F4E37; font-weight: 600; text-decoration: underline; font-size: 13px; }
  `],
})
export class TrackOrderPageComponent implements OnInit {
  checkoutService = inject(CheckoutService);
  recentOrders = inject(RecentOrdersService);
  router = inject(Router);

  private static readonly PHONE_PATTERN = /^[\d\s()+-]{7,20}$/;

  orderNumber = '';
  guestPhone = '';
  submitting = signal(false);
  errorMessage = signal('');

  ngOnInit() {
    // Background-verify the recalled order is still actually active before trusting
    // localStorage — otherwise a long-completed order could keep showing as "in progress"
    // until it ages out. Guards against getOrderStatus()'s own catchError fallback (which
    // returns a stale, possibly unrelated lastOrder() on a network error) by checking the
    // returned publicToken actually matches what was asked for.
    const entry = this.recentOrders.mostRecent();
    if (!entry) return;
    this.checkoutService.getOrderStatus(entry.publicToken).subscribe(order => {
      if (order && order.publicToken === entry.publicToken && (order.status === 'COMPLETED' || order.status === 'CANCELLED')) {
        this.recentOrders.forget(entry.publicToken);
      }
    });
  }

  canSubmit(): boolean {
    return this.orderNumber.trim().length > 0 && TrackOrderPageComponent.PHONE_PATTERN.test(this.guestPhone.trim());
  }

  submit() {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    this.checkoutService.lookupOrder({
      orderNumber: this.orderNumber.trim(),
      guestPhone: this.guestPhone.trim(),
    }).subscribe({
      next: order => {
        this.recentOrders.remember(order);
        this.submitting.set(false);
        this.router.navigate(['/order-status', order.publicToken]);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.status === 404
            ? "We couldn't find an order matching that order number and phone number. Please double-check and try again."
            : err.error?.message || 'Something went wrong — please try again.'
        );
      },
    });
  }
}
