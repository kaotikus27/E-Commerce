import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { CheckoutService } from '../../../core/services/checkout.service';
import { AuthService } from '../../../core/services/auth.service';
import { StoreService } from '../../../core/services/store.service';
import { DeliveryService } from '../../../core/services/delivery.service';
import { GeocodeCandidate } from '../../../core/models/delivery.model';
import { PromoCodeService } from '../../../core/services/promo-code.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FulfillmentType, OrderRequest, PaymentMethod } from '../../../core/models/order.model';
import { toAbsoluteImageUrl } from '../../../core/utils/image-url.util';
import { DeliveryMapComponent } from '../delivery-map/delivery-map.component';
import { PickupTimePickerComponent } from '../../cart/pickup-time-picker.component';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DeliveryMapComponent, PickupTimePickerComponent],
  template: `
    <section class="container checkout-page">
      <h1>Checkout</h1>

      <div class="checkout-grid">
        <div class="checkout-form">
          <!-- Step 1: Contact -->
          <div class="card step">
            <h3>👤 Contact Info</h3>
            @if (auth.isAuthenticated()) {
              <p>Ordering as <strong>{{ auth.user()?.name }}</strong> ({{ auth.user()?.email }})</p>
            } @else {
              <div class="field-row">
                <div class="field">
                  <label for="name">Full Name</label>
                  <input id="name" [(ngModel)]="guestName" name="guestName" placeholder="Jane Doe" />
                  @if (nameError()) { <span class="field-error">{{ nameError() }}</span> }
                </div>
                <div class="field">
                  <label for="email">Email Address</label>
                  <input id="email" type="email" [(ngModel)]="guestEmail" name="guestEmail" placeholder="jane@example.com" />
                  @if (emailError()) { <span class="field-error">{{ emailError() }}</span> }
                </div>
                <div class="field">
                  <label for="phone">Mobile Number</label>
                  <input id="phone" type="tel" [(ngModel)]="guestPhone" name="guestPhone" placeholder="+63 912 345 6789" />
                  @if (phoneError()) { <span class="field-error">{{ phoneError() }}</span> }
                </div>
              </div>
            }
          </div>

          <!-- Step 2: Fulfillment -->
          <div class="card step">
            <h3>🏠 Fulfillment &amp; Delivery</h3>
            <div class="payment-options">
              <label class="radio-row">
                <input type="radio" name="fulfillment" value="PICKUP" [(ngModel)]="fulfillmentType" (ngModelChange)="onFulfillmentTypeChange()" />
                Pickup
              </label>
              <label class="radio-row">
                <input type="radio" name="fulfillment" value="DELIVERY" [(ngModel)]="fulfillmentType" (ngModelChange)="onFulfillmentTypeChange()" />
                Delivery
              </label>

              @if (fulfillmentType === 'PICKUP') {
                <app-pickup-time-picker (timeSelected)="cart.setPickupTime($event)"></app-pickup-time-picker>
                @if (store.leadTimeMinutes() > 0) {
                  <p class="prep-note">💡 Orders take ~{{ store.leadTimeMinutes() }} mins to prepare fresh.</p>
                }
              }

              @if (fulfillmentType === 'DELIVERY') {
                <div class="delivery-box">
                  <div class="field">
                    <label for="delivery-house-unit">House / Unit / Building No. *</label>
                    <input id="delivery-house-unit" [(ngModel)]="deliveryHouseUnit" name="deliveryHouseUnit"
                      placeholder="e.g. Blk 18 Lot 16, Unit 2B"
                      (ngModelChange)="onDeliveryUnitFieldChanged()" />
                  </div>
                  <div class="field">
                    <label for="delivery-street">Street Name</label>
                    <input id="delivery-street" [(ngModel)]="deliveryStreet" name="deliveryStreet"
                      placeholder="e.g. Sampaguita Street"
                      (ngModelChange)="onDeliveryFieldChanged()" />
                  </div>
                  <div class="field">
                    <label for="delivery-subdivision">Subdivision / Village / Phase</label>
                    <input id="delivery-subdivision" [(ngModel)]="deliverySubdivision" name="deliverySubdivision"
                      placeholder="e.g. Sarmiento Homes, Phase 5"
                      (ngModelChange)="onDeliveryFieldChanged()" />
                  </div>
                  <div class="field-row field-row-2">
                    <div class="field">
                      <label for="delivery-barangay">Barangay *</label>
                      <input id="delivery-barangay" [(ngModel)]="deliveryBarangay" name="deliveryBarangay"
                        placeholder="e.g. Tigbe"
                        (ngModelChange)="onDeliveryFieldChanged()" />
                    </div>
                    <div class="field">
                      <label for="delivery-city">City / Municipality *</label>
                      <input id="delivery-city" [(ngModel)]="deliveryCity" name="deliveryCity"
                        placeholder="e.g. Norzagaray"
                        (ngModelChange)="onDeliveryFieldChanged()" />
                    </div>
                  </div>
                  <div class="field-row field-row-2">
                    <div class="field">
                      <label for="delivery-province">Province</label>
                      <input id="delivery-province" [(ngModel)]="deliveryProvince" name="deliveryProvince"
                        placeholder="e.g. Bulacan"
                        (ngModelChange)="onDeliveryFieldChanged()" />
                    </div>
                    <div class="field">
                      <label for="delivery-zip">Zip Code</label>
                      <input id="delivery-zip" [(ngModel)]="deliveryZip" name="deliveryZip"
                        placeholder="e.g. 3013"
                        (ngModelChange)="onDeliveryFieldChanged()" />
                    </div>
                  </div>
                  <div class="field">
                    <label for="delivery-landmark">Delivery Notes / Landmark</label>
                    <textarea id="delivery-landmark" [(ngModel)]="deliveryLandmarkNotes" name="deliveryLandmarkNotes" rows="2"
                      placeholder="e.g. Near the red gate, next to the tall pine tree"
                      (ngModelChange)="onDeliveryUnitFieldChanged()"></textarea>
                    <small class="address-hint">💡 Exact rider instructions — not used for the fee, just to find your door.</small>
                    @if (unitDetailsError()) { <span class="field-error">{{ unitDetailsError() }}</span> }
                  </div>
                  <details class="maps-link-toggle">
                    <summary>Have a Google Maps link instead?</summary>
                    <div class="field">
                      <label for="delivery-maps-link">Paste it here</label>
                      <input id="delivery-maps-link" [(ngModel)]="deliveryMapsLink" name="deliveryMapsLink"
                        placeholder="https://maps.app.goo.gl/…"
                        (ngModelChange)="onDeliveryFieldChanged()" />
                      <small class="address-hint">💡 Overrides the fields above and pinpoints your exact dropped pin.</small>
                    </div>
                  </details>
                  <button type="button" class="btn quote-btn btn-block" [disabled]="delivery.loading() || !deliveryAddress.trim()" (click)="getDeliveryQuote()">
                    📍 {{ delivery.loading() ? 'Getting Quote…' : 'Find My Location & Get Delivery Quote' }}
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
                        <p class="quote-fee-badge">🚚 Estimated Delivery Fee: <strong>₱{{ quote.feeTotal.toFixed(2) }}</strong></p>
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
            <h3>💸 Payment Method</h3>
            <div class="payment-options">
              <label class="radio-row">
                <input type="radio" name="pay" value="CASH_ON_PICKUP" [(ngModel)]="paymentMethod" />
                Cash on Pickup
              </label>
              <label class="radio-row">
                <input type="radio" name="pay" value="GCASH_MANUAL" [(ngModel)]="paymentMethod" />
                GCash / Maya
              </label>
              @if (paymentMethod === 'GCASH_MANUAL') {
                <div class="gcash-box">
                  @if (store.gcashQrImagePath()) {
                    <img [src]="toImageUrl(store.gcashQrImagePath())" alt="GCash QR code" class="gcash-qr" />
                  }
                  @if (store.gcashNumber()) {
                    <p class="gcash-instructions">
                      Send <strong>₱{{ estimatedTotal().toFixed(2) }}</strong> to
                      <strong>{{ store.gcashAccountName() }}</strong>
                    </p>
                    <div class="gcash-number-row">
                      <span class="gcash-number">{{ store.gcashNumber() }}</span>
                      <button type="button" class="copy-btn" (click)="copyGcashNumber()">
                        {{ copied() ? '✓ Copied' : 'Copy' }}
                      </button>
                    </div>
                    <p class="gcash-instructions">then upload a screenshot of your receipt below.</p>
                  } @else {
                    <p class="gcash-instructions">GCash details aren't set up yet — please ask staff for the account to send payment to, then upload a screenshot of your receipt below.</p>
                  }

                  <div
                    class="upload-zone"
                    [class.drag-over]="dragOver()"
                    [class.has-file]="!!receiptFile()"
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onFileDropped($event)">
                    @if (receiptFile()) {
                      <p class="upload-confirm">✅ Receipt received!</p>
                      <p class="file-chosen">{{ receiptFile()!.name }}</p>
                    } @else {
                      <p class="upload-prompt">📸 Drag &amp; drop your payment screenshot here</p>
                    }
                    <label class="btn btn-secondary btn-sm browse-btn">
                      Browse Files
                      <input id="receipt-file" type="file" accept="image/*" (change)="onReceiptFileSelected($event)" hidden />
                    </label>
                    <p class="upload-hint">PNG, JPG up to 5MB</p>
                  </div>
                  @if (receiptFileError()) { <span class="field-error">{{ receiptFileError() }}</span> }
                </div>
              }
            </div>
          </div>

          <!-- Step 4: Notes -->
          <div class="card step">
            <h3>📜 Special Instructions</h3>
            <div class="field">
              <label for="notes">Notes for the kitchen (optional)</label>
              <textarea id="notes" [(ngModel)]="notes" name="notes" maxlength="150" rows="2" placeholder="e.g. Extra hot, nut allergy"></textarea>
              <span class="char-count">{{ notes.length }}/150</span>
            </div>
          </div>

        </div>

        <aside class="order-summary card">
          <h3>🧾 Order Review</h3>
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
          @if (promo.applied(); as applied) {
            <div class="review-row discount-row">
              <span>🏷️ {{ applied.code }}</span>
              <span>-₱{{ appliedDiscount().toFixed(2) }} <button type="button" class="promo-remove-btn" (click)="removePromoCode()">Remove</button></span>
            </div>
          }
          <div class="review-row"><span>Tax</span><span>₱{{ estimatedTax().toFixed(2) }}</span></div>
          @if (fulfillmentType === 'DELIVERY') {
            <div class="review-row"><span>Delivery Fee</span><span>₱{{ (delivery.quote()?.feeTotal ?? 0).toFixed(2) }}</span></div>
          }
          <div class="review-row total"><span>Total (est.)</span><span>₱{{ estimatedTotal().toFixed(2) }}</span></div>

          @if (!promo.applied()) {
            <div class="promo-box">
              <div class="promo-input-row">
                <input type="text" [(ngModel)]="promoCodeInput" name="promoCodeInput" placeholder="Promo code"
                  (ngModelChange)="promo.error.set('')" />
                <button type="button" class="btn btn-secondary btn-sm" [disabled]="promo.loading() || !promoCodeInput.trim()" (click)="applyPromoCode()">
                  {{ promo.loading() ? 'Applying…' : 'Apply' }}
                </button>
              </div>
              @if (promo.error()) { <span class="field-error">{{ promo.error() }}</span> }
            </div>
          }

          @if (errorMessage()) {
            <p class="error">{{ errorMessage() }}</p>
          }

          <button class="btn place-order-btn btn-block" [disabled]="submitting()" (click)="submitOrder()">
            {{ submitting() ? 'Placing Order…' : '🌟 Place Order — ₱' + estimatedTotal().toFixed(2) }}
          </button>
          <p class="trust-line">🔒 Safe &amp; secure order • Baked with love</p>
        </aside>
      </div>
    </section>
  `,
  styles: [`
    /* Bespoke palette matching the item-modal/cart-drawer (DEC-030/034) — Parchment Cream /
       Warm Oak / Forest Sage / Spirit Orange — not the site's global tokens. Phase 1 of
       docs/checkout-redesign-notes.md: visual restyle only, no layout/structural changes. */
    .checkout-page { padding: 24px 16px 48px; max-width: 1180px; background: #F7F3E9; overflow-x: hidden; }
    .checkout-page h1 { color: #2E4A3B; }
    /* min-width: 0 on every grid/flex item below overrides the default min-width: auto —
       without it, an oversized descendant (e.g. the horizontally-scrolling time-slot row)
       forces its ancestor chain wider instead of scrolling within its own overflow-x. */
    .checkout-grid { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; min-width: 0; }
    .checkout-form, .order-summary { min-width: 0; }
    @media (min-width: 900px) {
      .checkout-grid { grid-template-columns: 1.6fr 1fr; }
      .order-summary { position: sticky; top: 20px; }
    }
    .card, .step {
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
      padding: 24px; margin-bottom: 16px; background: #FDFBF7; border: 1.5px solid #D4C3A3;
      border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    .order-summary { margin-bottom: 0; }
    .card h3, .step h3 { margin: 0 0 16px; color: #2E4A3B; }
    .field-row { display: grid; grid-template-columns: 1fr; gap: 12px; min-width: 0; }
    .field-row > * { min-width: 0; }
    @media (min-width: 560px) { .field-row { grid-template-columns: repeat(3, 1fr); } }
    .field-row-2 { display: grid; grid-template-columns: 1fr; gap: 12px; min-width: 0; }
    .field-row-2 > * { min-width: 0; }
    @media (min-width: 420px) { .field-row-2 { grid-template-columns: repeat(2, 1fr); } }
    .delivery-box .field { margin-bottom: 12px; }
    .delivery-box .field-row-2 { margin-bottom: 0; }
    .maps-link-toggle { margin: 4px 0 12px; }
    .maps-link-toggle summary { cursor: pointer; font-size: 13px; font-weight: 700; color: #2E4A3B; }
    .maps-link-toggle .field { margin-top: 10px; margin-bottom: 0; }
    input, textarea, select { background: #FDFBF7; }
    input:focus, textarea:focus, select:focus { outline: none; box-shadow: 0 0 0 3px rgba(212, 195, 163, 0.5); border-color: #6F4E37; }
    .hint { font-size: 13px; }
    .hint a { color: #2E4A3B; font-weight: 700; text-decoration: underline; }
    .payment-options { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .payment-options > app-pickup-time-picker { min-width: 0; }
    .radio-row { display: flex; align-items: center; gap: 8px; font-weight: 600; min-height: 44px; color: #6F4E37; }
    .prep-note { font-size: 12px; color: #6F4E37; background: #F0E4C8; padding: 8px 12px; border-radius: var(--radius-sm); margin: 4px 0 8px; }
    .gcash-box { background: #F0E4C8; border-radius: var(--radius-sm); padding: 16px; margin: 4px 0 8px; }
    .gcash-instructions { font-size: 13px; line-height: 1.5; margin: 0 0 10px; color: #6F4E37; }
    .gcash-qr { display: block; width: 180px; height: 180px; max-width: 100%; object-fit: contain; margin: 0 auto 12px; border-radius: var(--radius-sm); background: #fff; padding: 8px; border: 3px solid #6F4E37; }
    .gcash-number-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .gcash-number { font-weight: 700; color: #2E4A3B; font-size: 15px; }
    .copy-btn {
      background: var(--color-white); border: 1.5px solid #6F4E37; color: #6F4E37;
      border-radius: var(--radius-pill); padding: 4px 12px; font-size: 12px; font-weight: 700; min-height: 44px;
    }
    .upload-zone {
      border: 1.5px dashed #D4C3A3; border-radius: var(--radius-md); padding: 20px; text-align: center;
      background: #FDFBF7; transition: border-color .15s ease, background .15s ease;
    }
    .upload-zone.drag-over { border-color: #D96B43; background: #F0E4C8; }
    .upload-zone.has-file { border-style: solid; border-color: #2E4A3B; }
    .upload-prompt { font-size: 14px; color: #6F4E37; margin: 0 0 10px; }
    .upload-confirm { font-size: 14px; font-weight: 700; color: #2E4A3B; margin: 0 0 2px; }
    .browse-btn { display: inline-flex; margin-top: 4px; cursor: pointer; }
    .upload-hint { font-size: 11px; color: var(--color-text-muted); margin: 8px 0 0; }
    .delivery-box { width: 100%; max-width: 100%; box-sizing: border-box; background: #F0E4C8; border-radius: var(--radius-sm); padding: 16px; margin: 4px 0 8px; }
    .address-hint { display: block; font-size: 12px; color: #6F4E37; margin-top: 4px; }
    .delivery-error { margin-top: 8px; }
    .quote-btn { background: #D96B43; color: var(--color-white); border: none; margin-top: 4px; }
    .quote-btn:hover:not(:disabled) { background: #c15a35; }
    .candidates-box { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
    .candidates-hint { font-size: 13px; font-weight: 600; margin: 0; color: #6F4E37; }
    .candidate-option { text-align: left; background: #fff; border: 1px solid #D4C3A3; border-radius: var(--radius-sm); padding: 10px 12px; font-size: 13px; cursor: pointer; min-height: 44px; display: flex; align-items: center; }
    .candidate-option:hover { border-color: #2E4A3B; }
    .quote-box { margin-top: 10px; font-size: 13px; line-height: 1.6; color: #6F4E37; }
    .quote-fee-badge {
      display: inline-block; background: #F0E4C8; border: 1px solid #D4C3A3; border-radius: var(--radius-pill);
      padding: 6px 14px; font-weight: 600; color: #6F4E37;
    }
    .quote-fee-badge strong { color: #D96B43; }
    .map-hint { font-size: 12px; color: #6F4E37; margin: 8px 0 6px; }
    .confirm-pin-btn { margin-top: 8px; }
    .quote-countdown { color: var(--color-text-muted); font-size: 12px; }
    .verify-route-link { display: inline-block; margin-top: 6px; font-size: 13px; font-weight: 700; color: #2E4A3B; text-decoration: underline; }
    .char-count { font-size: 12px; color: var(--color-text-muted); align-self: flex-end; }
    .file-chosen { font-size: 12px; color: var(--color-text-muted); }
    .pickup-line { font-size: 14px; margin-bottom: 8px; color: #6F4E37; }
    .review-row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; color: #6F4E37; }
    .review-row.total { font-weight: 700; font-size: 16px; border-top: 1.5px dashed #6F4E37; margin-top: 8px; padding-top: 8px; color: #2E4A3B; }
    .discount-row { color: #D96B43; font-weight: 700; }
    .discount-row span:last-child { display: flex; align-items: center; gap: 8px; }
    .promo-remove-btn { background: none; border: none; padding: 0 2px; font-size: 11px; font-weight: 600; color: #6F4E37; text-decoration: underline; cursor: pointer; min-height: 44px; display: inline-flex; align-items: center; }
    .promo-box { margin: 10px 0; }
    .promo-input-row { display: flex; gap: 8px; }
    .promo-input-row input { flex: 1; background: #FDFBF7; border: 1.5px solid #D4C3A3; border-radius: var(--radius-sm); padding: 10px 14px; font-size: 16px; min-height: 44px; }
    .promo-input-row .btn { flex-shrink: 0; }
    .error { color: var(--color-error); font-weight: 600; margin-bottom: 12px; }
    .field-error { color: var(--color-error); font-size: 12px; font-weight: 600; }
    .place-order-btn { background: #D96B43; color: var(--color-white); border: none; font-size: 16px; }
    .place-order-btn:hover:not(:disabled) { background: #c15a35; }
    .trust-line { text-align: center; font-size: 12px; color: #6F4E37; margin: 10px 0 0; }
  `],
})
export class CheckoutPageComponent implements OnInit, OnDestroy {
  cart = inject(CartService);
  checkout = inject(CheckoutService);
  auth = inject(AuthService);
  store = inject(StoreService);
  delivery = inject(DeliveryService);
  promo = inject(PromoCodeService);
  notifications = inject(NotificationService);
  router = inject(Router);

  private static readonly PHONE_PATTERN = /^[\d\s()+-]{7,20}$/;
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  /** Nudges values sitting exactly on a rounding boundary (e.g. 730 * 0.0875 === 63.87499999999999
   *  in floating point, not 63.875) back onto the correct side before Math.round — otherwise these
   *  estimates can round a cent below what the backend's exact decimal math actually charges. */
  private static readonly ROUNDING_EPSILON = 1e-9;

  guestName = '';
  guestPhone = '';
  guestEmail = '';
  paymentMethod: PaymentMethod = 'CASH_ON_PICKUP';
  receiptFile = signal<File | null>(null);
  copied = signal(false);
  dragOver = signal(false);
  toImageUrl = toAbsoluteImageUrl;
  notes = '';
  submitting = signal(false);
  errorMessage = signal('');
  nameError = signal('');
  phoneError = signal('');
  emailError = signal('');
  receiptFileError = signal('');

  fulfillmentType: FulfillmentType = 'PICKUP';
  // Structured PH address fields (Phase 3, docs/checkout-redesign-notes.md §5 Option B) — collected
  // separately for a cleaner form, then concatenated into the same free-text search string the
  // existing geocoding backend (DEC-001) already expects. No backend contract change.
  deliveryHouseUnit = '';
  deliveryStreet = '';
  deliverySubdivision = '';
  deliveryBarangay = '';
  deliveryCity = '';
  deliveryProvince = '';
  deliveryZip = '';
  deliveryLandmarkNotes = '';
  deliveryMapsLink = '';
  /** Derived from the structured fields above (or `deliveryMapsLink` verbatim, if set) — this is
   *  what actually gets sent to `delivery.getQuote()`, unchanged from the old single free-text field. */
  deliveryAddress = '';
  /** Derived from `deliveryHouseUnit` + `deliveryLandmarkNotes` — rider instructions, not used for the fee. */
  deliveryUnitDetails = '';
  unitDetailsError = signal('');
  promoCodeInput = '';
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

  /** Re-derives the discount against the CURRENT cart subtotal (not a stale snapshot from the
   *  moment "Apply" was clicked) using the same formula the backend uses to resolve it
   *  authoritatively at order placement — so the preview stays accurate if the cart changes
   *  after a code is applied, without needing to re-call the validate endpoint. */
  readonly appliedDiscount = computed(() => {
    const applied = this.promo.applied();
    if (!applied) return 0;
    const subtotal = this.cart.subtotal();
    const raw = applied.discountType === 'PERCENT'
      ? Math.round(subtotal * applied.discountValue) / 100
      : applied.discountValue;
    return Math.min(raw, subtotal);
  });

  readonly estimatedTax = computed(() => {
    const discountedSubtotal = Math.max(0, this.cart.subtotal() - this.appliedDiscount());
    return Math.round(discountedSubtotal * 0.0875 * 100 + CheckoutPageComponent.ROUNDING_EPSILON) / 100;
  });

  readonly estimatedTotal = computed(() => {
    // Read quote() unconditionally (not inside the ternary) so it's always a tracked dependency —
    // otherwise, on the first evaluation while still on PICKUP, the DELIVERY branch — and its
    // quote() read — is skipped entirely, and this computed never re-runs when a quote arrives later.
    const quoteFee = this.delivery.quote()?.feeTotal ?? 0;
    const deliveryFee = this.fulfillmentType === 'DELIVERY' ? quoteFee : 0;
    const discountedSubtotal = Math.max(0, this.cart.subtotal() - this.appliedDiscount());
    return Math.round((discountedSubtotal + this.estimatedTax() + deliveryFee) * 100 + CheckoutPageComponent.ROUNDING_EPSILON) / 100;
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
    // Delivery has no "pickup time" concept of its own — Lalamove is always dispatched
    // ASAP, never scheduled — but the backend still requires a non-null pickupTime on every
    // order, so we set it here instead of showing the picker. Clearing it on PICKUP lets
    // <app-pickup-time-picker> remount and default back to its own next-available slot.
    if (this.fulfillmentType === 'DELIVERY') {
      this.cart.setPickupTime('ASAP');
    } else {
      this.cart.setPickupTime('');
    }
  }

  onAddressChanged() {
    this.delivery.clear();
    this.adjustedPin.set(null);
  }

  onUnitDetailsChanged() {
    this.unitDetailsError.set('');
  }

  /** Recomputes `deliveryAddress` from the structured search fields (or `deliveryMapsLink`
   *  verbatim, if set) whenever one of them changes. */
  onDeliveryFieldChanged() {
    this.deliveryAddress = this.deliveryMapsLink.trim()
      ? this.deliveryMapsLink.trim()
      : [this.deliveryStreet, this.deliverySubdivision, this.deliveryBarangay, this.deliveryCity, this.deliveryProvince, this.deliveryZip]
          .map(part => part.trim())
          .filter(Boolean)
          .join(', ');
    this.onAddressChanged();
  }

  /** Recomputes `deliveryUnitDetails` from the house/unit + landmark-notes fields. */
  onDeliveryUnitFieldChanged() {
    this.deliveryUnitDetails = [this.deliveryHouseUnit.trim(), this.deliveryLandmarkNotes.trim()]
      .filter(Boolean)
      .join(' — ');
    this.onUnitDetailsChanged();
  }

  applyPromoCode() {
    if (!this.promoCodeInput.trim()) return;
    this.promo.apply(this.promoCodeInput.trim(), this.cart.subtotal()).subscribe();
  }

  removePromoCode() {
    this.promo.clear();
    this.promoCodeInput = '';
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
    this.setReceiptFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
  }

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.setReceiptFile(file);
  }

  private setReceiptFile(file: File | null) {
    this.receiptFile.set(file);
    if (file) this.receiptFileError.set('');
  }

  copyGcashNumber() {
    const number = this.store.gcashNumber();
    if (!number) return;
    navigator.clipboard.writeText(number).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
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
      tax: this.estimatedTax(),
      total: this.estimatedTotal(),
      notes: this.notes.trim() || undefined,
      promoCode: this.promo.applied()?.code,
    };

    this.checkout.placeOrder(request).subscribe({
      next: order => {
        this.cart.clear();
        this.delivery.clear();
        this.promo.clear();
        this.notifications.success('Order placed!');
        this.router.navigate(['/order-confirmation', order.publicToken]);
        this.submitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        // Surface the backend's actual reason (e.g. a reused GCash receipt reference, or the
        // store having just closed) instead of a generic message — most failures here are a
        // specific, actionable conflict the customer can fix themselves, not a dead server.
        this.errorMessage.set(err.error?.message || 'Could not place your order — the server may be unreachable. Please try again.');
        this.submitting.set(false);
      },
    });
  }
}
