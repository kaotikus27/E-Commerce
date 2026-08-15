import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { CheckoutService } from '../../../core/services/checkout.service';
import { AuthService } from '../../../core/services/auth.service';
import { StoreService } from '../../../core/services/store.service';
import { DeliveryService } from '../../../core/services/delivery.service';
import { GeocodeCandidate } from '../../../core/models/delivery.model';
import { NotificationService } from '../../../core/services/notification.service';
import { FulfillmentType, OrderRequest, PaymentMethod } from '../../../core/models/order.model';
import { toAbsoluteImageUrl } from '../../../core/utils/image-url.util';
import { DeliveryMapComponent } from '../delivery-map/delivery-map.component';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DeliveryMapComponent],
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

          <!-- Step 2: Fulfillment -->
          <div class="card step">
            <h3>2. Fulfillment</h3>
            <div class="payment-options">
              <label class="radio-row">
                <input type="radio" name="fulfillment" value="PICKUP" [(ngModel)]="fulfillmentType" (ngModelChange)="onFulfillmentTypeChange()" />
                Pickup
              </label>
              <label class="radio-row">
                <input type="radio" name="fulfillment" value="DELIVERY" [(ngModel)]="fulfillmentType" (ngModelChange)="onFulfillmentTypeChange()" />
                Delivery
              </label>
              @if (fulfillmentType === 'DELIVERY') {
                <div class="delivery-box">
                  <div class="field">
                    <label for="delivery-address">Search Subdivision / Landmark / Barangay *</label>
                    <textarea id="delivery-address" [(ngModel)]="deliveryAddress" name="deliveryAddress" rows="2"
                      placeholder="e.g. Tokyo Liquor House, Sarmiento Homes, SJDM, Bulacan"
                      (ngModelChange)="onAddressChanged()"></textarea>
                    <small class="address-hint">💡 Used to pinpoint your general location and calculate the delivery fee. You can also paste a Google Maps link instead of typing an address.</small>
                  </div>
                  <div class="field">
                    <label for="delivery-unit-details">House/Unit No., Block &amp; Lot, Gate Details *</label>
                    <textarea id="delivery-unit-details" [(ngModel)]="deliveryUnitDetails" name="deliveryUnitDetails" rows="2"
                      placeholder="e.g. Blk 18 Lot 16 Phase 5, North Gate, Red Door"
                      (ngModelChange)="onUnitDetailsChanged()"></textarea>
                    <small class="address-hint">💡 Exact rider instructions — not used for the fee, just to find your door.</small>
                    @if (unitDetailsError()) { <span class="field-error">{{ unitDetailsError() }}</span> }
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" [disabled]="delivery.loading() || !deliveryAddress.trim()" (click)="getDeliveryQuote()">
                    {{ delivery.loading() ? 'Getting Quote…' : 'Get Delivery Quote' }}
                  </button>

                  @if (delivery.error()) {
                    <p class="field-error delivery-error">{{ delivery.error() }}</p>
                  }

                  @if (delivery.candidates(); as candidates) {
                    <div class="candidates-box">
                      <p class="candidates-hint">That matched more than one place — which one did you mean?</p>
                      @for (candidate of candidates; track candidate.label) {
                        <button type="button" class="candidate-option" [disabled]="delivery.loading()" (click)="chooseCandidate(candidate)">
                          📍 {{ candidate.label }}
                        </button>
                      }
                    </div>
                  }

                  @if (delivery.quote(); as quote) {
                    @if (!delivery.isExpired()) {
                      <div class="quote-box">
                        <p class="quote-address">Delivering to: <strong>{{ quote.resolvedAddress }}</strong></p>
                        <p class="quote-fee">Delivery Fee: <strong>₱{{ quote.feeTotal.toFixed(2) }}</strong></p>
                        <p class="quote-countdown">Quote expires in {{ formattedCountdown() }}</p>
                        <a [href]="quote.googleMapsRouteUrl" target="_blank" rel="noopener" class="verify-route-link">📍 Verify Pinpoint on Google Maps</a>

                        <p class="map-hint">Not quite right? Drag the pin to your exact door.</p>
                        <app-delivery-map
                          [latitude]="quote.latitude"
                          [longitude]="quote.longitude"
                          (pinMoved)="onPinMoved($event)">
                        </app-delivery-map>
                        @if (adjustedPin()) {
                          <button type="button" class="btn btn-secondary btn-sm confirm-pin-btn" [disabled]="delivery.loading()" (click)="confirmAdjustedPin()">
                            {{ delivery.loading() ? 'Updating…' : 'Confirm new location' }}
                          </button>
                        }
                      </div>
                    } @else {
                      <p class="field-error">This quote has expired — please get a new one.</p>
                    }
                  }
                </div>
              }
            </div>
          </div>

          <!-- Step 3: Payment -->
          <div class="card step">
            <h3>3. Payment Method</h3>
            <div class="payment-options">
              <label class="radio-row">
                <input type="radio" name="pay" value="CASH_ON_PICKUP" [(ngModel)]="paymentMethod" />
                Cash on Pickup
              </label>
              <label class="radio-row">
                <input type="radio" name="pay" value="GCASH_MANUAL" [(ngModel)]="paymentMethod" />
                GCash
              </label>
              @if (paymentMethod === 'GCASH_MANUAL') {
                <div class="gcash-box">
                  @if (store.gcashNumber()) {
                    <p class="gcash-instructions">
                      Send <strong>₱{{ estimatedTotal().toFixed(2) }}</strong> to
                      <strong>{{ store.gcashAccountName() }}</strong> — {{ store.gcashNumber() }},
                      then upload a screenshot of your GCash receipt below.
                    </p>
                  } @else {
                    <p class="gcash-instructions">GCash details aren't set up yet — please ask staff for the account to send payment to, then upload a screenshot of your receipt below.</p>
                  }
                  @if (store.gcashQrImagePath()) {
                    <img [src]="toImageUrl(store.gcashQrImagePath())" alt="GCash QR code" class="gcash-qr" />
                  }
                  <div class="field">
                    <label for="receipt-file">GCash Receipt Screenshot</label>
                    <input id="receipt-file" type="file" accept="image/*" (change)="onReceiptFileSelected($event)" />
                    @if (receiptFile()) { <span class="file-chosen">Selected: {{ receiptFile()!.name }}</span> }
                    @if (receiptFileError()) { <span class="field-error">{{ receiptFileError() }}</span> }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Step 4: Notes -->
          <div class="card step">
            <h3>4. Special Instructions</h3>
            <div class="field">
              <label for="notes">Notes for the kitchen (optional)</label>
              <textarea id="notes" [(ngModel)]="notes" name="notes" maxlength="150" rows="2" placeholder="e.g. Extra hot, nut allergy"></textarea>
              <span class="char-count">{{ notes.length }}/150</span>
            </div>
          </div>

          <!-- Step 5: Review -->
          <div class="card step">
            <h3>5. Order Review</h3>
            @if (cart.pickupTime()) {
              <p class="pickup-line"><strong>{{ fulfillmentType === 'DELIVERY' ? 'Ready by' : 'Pickup' }}:</strong> {{ cart.pickupTime() }}</p>
            }
            @if (fulfillmentType === 'DELIVERY' && delivery.quote() && !delivery.isExpired()) {
              <p class="pickup-line"><strong>Deliver to:</strong> {{ deliveryUnitDetails }}, {{ delivery.quote()!.resolvedAddress }}</p>
            }
            @for (item of cart.items(); track item.id) {
              <div class="review-row">
                <span>{{ item.quantity }}× {{ item.product.name }}</span>
                <span>₱{{ item.lineTotal.toFixed(2) }}</span>
              </div>
            }
            <div class="review-row"><span>Subtotal</span><span>₱{{ cart.subtotal().toFixed(2) }}</span></div>
            <div class="review-row"><span>Tax</span><span>₱{{ cart.tax().toFixed(2) }}</span></div>
            @if (fulfillmentType === 'DELIVERY') {
              <div class="review-row"><span>Delivery Fee</span><span>₱{{ (delivery.quote()?.feeTotal ?? 0).toFixed(2) }}</span></div>
            }
            <div class="review-row total"><span>Total (est.)</span><span>₱{{ estimatedTotal().toFixed(2) }}</span></div>
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
    .gcash-box { background: var(--color-subdued-pistachio); border-radius: var(--radius-sm); padding: 12px; margin: 4px 0 8px; }
    .gcash-instructions { font-size: 13px; line-height: 1.5; margin: 0 0 10px; }
    .gcash-qr { display: block; width: 220px; height: 220px; max-width: 100%; object-fit: contain; margin: 0 auto 12px; border-radius: var(--radius-sm); background: #fff; padding: 8px; }
    .delivery-box { background: var(--color-subdued-pistachio); border-radius: var(--radius-sm); padding: 12px; margin: 4px 0 8px; }
    .address-hint { display: block; font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }
    .delivery-error { margin-top: 8px; }
    .candidates-box { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
    .candidates-hint { font-size: 13px; font-weight: 600; margin: 0; }
    .candidate-option { text-align: left; background: #fff; border: 1px solid var(--color-pistachio); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 13px; cursor: pointer; }
    .candidate-option:hover { border-color: var(--color-sage-700); }
    .quote-box { margin-top: 10px; font-size: 13px; line-height: 1.6; }
    .map-hint { font-size: 12px; color: var(--color-text-muted); margin: 8px 0 6px; }
    .confirm-pin-btn { margin-top: 8px; }
    .quote-fee { font-weight: 700; }
    .quote-countdown { color: var(--color-text-muted); font-size: 12px; }
    .verify-route-link { display: inline-block; margin-top: 6px; font-size: 13px; font-weight: 700; color: var(--color-sage-700); text-decoration: underline; }
    .char-count { font-size: 12px; color: var(--color-text-muted); align-self: flex-end; }
    .file-chosen { font-size: 12px; color: var(--color-text-muted); }
    .pickup-line { font-size: 14px; margin-bottom: 8px; }
    .review-row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; }
    .review-row.total { font-weight: 700; font-size: 16px; border-top: 1.5px dashed var(--color-pistachio); margin-top: 8px; padding-top: 8px; color: var(--color-espresso); }
    .error { color: var(--color-error); font-weight: 600; margin-bottom: 12px; }
    .field-error { color: var(--color-error); font-size: 12px; font-weight: 600; }
  `],
})
export class CheckoutPageComponent implements OnInit, OnDestroy {
  cart = inject(CartService);
  checkout = inject(CheckoutService);
  auth = inject(AuthService);
  store = inject(StoreService);
  delivery = inject(DeliveryService);
  notifications = inject(NotificationService);
  router = inject(Router);

  private static readonly PHONE_PATTERN = /^[\d\s()+-]{7,20}$/;
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  guestName = '';
  guestPhone = '';
  guestEmail = '';
  paymentMethod: PaymentMethod = 'CASH_ON_PICKUP';
  receiptFile = signal<File | null>(null);
  toImageUrl = toAbsoluteImageUrl;
  notes = '';
  submitting = signal(false);
  errorMessage = signal('');
  nameError = signal('');
  phoneError = signal('');
  emailError = signal('');
  receiptFileError = signal('');

  fulfillmentType: FulfillmentType = 'PICKUP';
  deliveryAddress = '';
  deliveryUnitDetails = '';
  unitDetailsError = signal('');
  /** Set while the customer has dragged the map pin but not yet confirmed the adjustment. */
  adjustedPin = signal<{ latitude: number; longitude: number } | null>(null);
  private nowTick = signal(Date.now());
  private countdownTimer?: ReturnType<typeof setInterval>;

  readonly remainingSeconds = computed(() => {
    const quote = this.delivery.quote();
    if (!quote) return 0;
    return Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - this.nowTick()) / 1000));
  });

  readonly formattedCountdown = computed(() => {
    const total = this.remainingSeconds();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  readonly estimatedTotal = computed(() => {
    // Read quote() unconditionally (not inside the ternary) so it's always a tracked dependency —
    // otherwise, on the first evaluation while still on PICKUP, the DELIVERY branch — and its
    // quote() read — is skipped entirely, and this computed never re-runs when a quote arrives later.
    const quoteFee = this.delivery.quote()?.feeTotal ?? 0;
    const deliveryFee = this.fulfillmentType === 'DELIVERY' ? quoteFee : 0;
    return this.cart.total() + deliveryFee;
  });

  ngOnInit() {
    this.countdownTimer = setInterval(() => this.nowTick.set(Date.now()), 1000);
  }

  ngOnDestroy() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  onFulfillmentTypeChange() {
    this.delivery.clear();
    this.adjustedPin.set(null);
  }

  onAddressChanged() {
    this.delivery.clear();
    this.adjustedPin.set(null);
  }

  onUnitDetailsChanged() {
    this.unitDetailsError.set('');
  }

  getDeliveryQuote() {
    this.adjustedPin.set(null);
    this.delivery.getQuote(this.deliveryAddress.trim()).subscribe();
  }

  chooseCandidate(candidate: GeocodeCandidate) {
    this.adjustedPin.set(null);
    this.delivery.chooseCandidate(candidate).subscribe();
  }

  /** Pin dragged on the map — just remember it locally; re-quoting happens only once the
   *  customer explicitly confirms, so we don't hit Lalamove on every drag. */
  onPinMoved(position: { latitude: number; longitude: number }) {
    this.adjustedPin.set(position);
  }

  confirmAdjustedPin() {
    const position = this.adjustedPin();
    if (!position) return;
    this.delivery.chooseCandidate({ label: '', latitude: position.latitude, longitude: position.longitude })
      .subscribe(() => this.adjustedPin.set(null));
  }

  onReceiptFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.receiptFile.set(file);
    if (file) this.receiptFileError.set('');
  }

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

  submitOrder() {
    this.errorMessage.set('');
    this.receiptFileError.set('');
    this.unitDetailsError.set('');

    if (!this.validateContactFields()) {
      this.errorMessage.set('Please fix the highlighted fields above.');
      return;
    }
    if (this.paymentMethod === 'GCASH_MANUAL' && !this.receiptFile()) {
      this.receiptFileError.set('Please upload a screenshot of your GCash receipt.');
      this.errorMessage.set('Please fix the highlighted fields above.');
      return;
    }
    if (this.fulfillmentType === 'DELIVERY' && !this.deliveryUnitDetails.trim()) {
      this.unitDetailsError.set('Please provide house/unit no., block & lot, or gate details for the rider.');
      this.errorMessage.set('Please fix the highlighted fields above.');
      return;
    }
    if (this.fulfillmentType === 'DELIVERY' && (!this.delivery.quote() || this.delivery.isExpired())) {
      this.errorMessage.set('Please get a valid delivery quote before placing your order.');
      return;
    }
    if (!this.cart.pickupTime()) {
      this.errorMessage.set("Please select a pickup time — we're closed right now, or no slot was chosen.");
      return;
    }

    this.submitting.set(true);

    const request: OrderRequest = {
      guestName: this.auth.user()?.name ?? this.guestName,
      guestPhone: this.guestPhone,
      guestEmail: this.guestEmail.trim() || undefined,
      pickupTime: this.cart.pickupTime(),
      paymentMethod: this.paymentMethod,
      receiptFile: this.paymentMethod === 'GCASH_MANUAL' ? this.receiptFile() ?? undefined : undefined,
      fulfillmentType: this.fulfillmentType,
      deliveryQuotationId: this.fulfillmentType === 'DELIVERY' ? this.delivery.quote()?.quotationId : undefined,
      deliveryUnitDetails: this.fulfillmentType === 'DELIVERY' ? this.deliveryUnitDetails.trim() : undefined,
      items: this.cart.items(),
      subtotal: this.cart.subtotal(),
      tax: this.cart.tax(),
      total: this.estimatedTotal(),
      notes: this.notes.trim() || undefined,
    };

    this.checkout.placeOrder(request).subscribe({
      next: order => {
        this.cart.clear();
        this.delivery.clear();
        this.notifications.success('Order placed!');
        this.router.navigate(['/order-confirmation', order.publicToken]);
        this.submitting.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not place your order — the server may be unreachable. Please try again.');
        this.submitting.set(false);
      },
    });
  }
}
