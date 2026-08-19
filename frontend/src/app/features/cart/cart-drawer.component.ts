import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { StoreService } from '../../core/services/store.service';
import { ChibiMascotComponent } from '../../shared/components/chibi-mascot/chibi-mascot.component';
import { toAbsoluteImageUrl } from '../../core/utils/image-url.util';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, ChibiMascotComponent],
  template: `
    @if (cart.isDrawerOpen()) {
      <div class="drawer-backdrop" (click)="cart.closeDrawer()">
        <aside class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div>
              <span class="eyebrow">Home Cafe by Bami</span>
              <h3>🧺 Your Cart</h3>
            </div>
            <div class="header-right">
              <img src="assets/soot-sprite.png" alt="" aria-hidden="true" class="header-sprite" />
              <button class="close-btn" (click)="cart.closeDrawer()" aria-label="Close cart">✕</button>
            </div>
          </div>

          @if (cart.isEmpty()) {
            <div class="empty">
              <app-chibi-mascot [size]="88" label="Empty cart mascot"></app-chibi-mascot>
              <p>Your cart is empty. Add something delicious!</p>
            </div>
          } @else {
            <span class="section-label">Selected Delights</span>
            <div class="items">
              @for (item of cart.items(); track item.id) {
                <div class="cart-item">
                  <img [src]="toAbsoluteImageUrl(item.product.image)" [alt]="item.product.name" />
                  <div class="item-info">
                    <div class="item-info-top">
                      <strong>{{ item.product.name }}</strong>
                      <button class="remove-btn" (click)="confirmRemove(item.id)" aria-label="Remove item">🗑</button>
                    </div>
                    @if (item.selectedOptions.length) {
                      <span class="opts">{{ optionsLabel(item) }}</span>
                    }
                    @if (item.giftWrap) {
                      <span class="opts">🎁 Gift wrapped</span>
                    }
                    <div class="item-bottom">
                      <span class="line-total">₱{{ item.lineTotal.toFixed(2) }}</span>
                      <div class="qty-row">
                        <button class="qty-btn" (click)="cart.updateQuantity(item.id, item.quantity - 1)" aria-label="Decrease quantity">−</button>
                        <span>{{ item.quantity }}</span>
                        <button class="qty-btn" (click)="cart.updateQuantity(item.id, item.quantity + 1)" aria-label="Increase quantity">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="summary">
              <div class="summary-row"><span>Subtotal</span><span>₱{{ cart.subtotal().toFixed(2) }}</span></div>
              <div class="summary-row"><span>VAT / Tax (Inc.)</span><span>₱{{ cart.tax().toFixed(2) }}</span></div>
              <div class="summary-row"><span>Pickup Fee</span><span class="free">FREE ✨</span></div>
              <div class="summary-row total"><span>Grand Total</span><span>₱{{ cart.total().toFixed(2) }}</span></div>
            </div>

            @if (store.loaded() && !store.isOpen()) {
              <p class="closed-banner">We're closed right now — checkout is unavailable until we re-open.</p>
            }
            <button class="btn btn-primary btn-block" [disabled]="store.loaded() && !store.isOpen()" (click)="goToCheckout()">
              {{ store.loaded() && !store.isOpen() ? "We're Closed Right Now" : '🌿 Proceed to Checkout' }}
            </button>
          }
        </aside>
      </div>
    }
  `,
  styles: [`
    /* Bespoke palette matching the item-modal (DEC-030): Parchment Cream / Warm Oak /
       Forest Sage / Spirit Orange — not the site's global tokens. */
    .drawer-backdrop { position: fixed; inset: 0; background: rgb(197 197 197 / 51%); z-index: 800; display: flex; justify-content: flex-end; }
    .drawer {
      background: #F7F3E9; width: 100%; max-width: 400px; height: 100%; overflow-y: auto;
      padding: 20px; animation: slideIn .2s ease; display: flex; flex-direction: column;
      scrollbar-width: none; -ms-overflow-style: none;
    }
    .drawer::-webkit-scrollbar { display: none; }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .eyebrow { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #D96B43; margin-bottom: 2px; }
    .drawer-header h3 { margin: 0; color: #2E4A3B; }
    .header-right { display: flex; align-items: center; gap: 8px; }
    .header-sprite { width: 32px; height: auto; }
    .close-btn { background: none; border: none; font-size: 18px; min-width: 44px; min-height: 44px; color: #6F4E37; }
    .empty { color: #6F4E37; text-align: center; margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }

    .section-label { display: block; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #2E4A3B; margin-bottom: 10px; }
    .items { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
    .cart-item {
      display: flex; gap: 10px; padding: 10px; background: var(--color-white);
      border: 1px solid #D9C89A; border-radius: var(--radius-md);
    }
    .cart-item img { width: 56px; height: 56px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .item-info-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .item-info-top strong { color: #2E4A3B; }
    .opts { font-size: 12px; color: #6F4E37; }
    .item-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
    .qty-row { display: flex; align-items: center; gap: 8px; background: #F7F3E9; border-radius: var(--radius-pill); padding: 2px; }
    .qty-btn { background: transparent; border: none; border-radius: var(--radius-pill); width: 44px; height: 44px; font-size: 16px; font-weight: 700; min-height: unset; color: #6F4E37; }
    .line-total { font-weight: 700; color: #D96B43; }
    .remove-btn { background: none; border: none; font-size: 15px; min-width: 44px; min-height: 44px; padding: 0; flex-shrink: 0; }


    .summary { border-top: 1.5px dashed #6F4E37; padding-top: 12px; margin-bottom: 16px; }
    .summary-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; color: #6F4E37; }
    .summary-row .free { color: #D96B43; font-weight: 700; }
    .summary-row.total { font-weight: 700; font-size: 16px; color: #2E4A3B; border-top: 1.5px dashed #6F4E37; padding-top: 8px; margin-top: 4px; }
    .closed-banner { background: var(--color-subdued-pistachio); color: var(--color-status-closed); font-size: 13px; font-weight: 700; text-align: center; padding: 10px; border-radius: var(--radius-sm); margin-bottom: 12px; }

    .btn.btn-primary.btn-block { background: #2E4A3B; color: #F7F3E9; border: none; }
    .btn.btn-primary.btn-block:hover:not(:disabled) { background: #22392c; }
  `],
})
export class CartDrawerComponent {
  cart = inject(CartService);
  store = inject(StoreService);
  router = inject(Router);
  toAbsoluteImageUrl = toAbsoluteImageUrl;

  optionsLabel(item: any) {
    return item.selectedOptions.map((o: any) => o.value).join(', ');
  }

  confirmRemove(id: string) {
    if (confirm('Remove this item from your cart?')) {
      this.cart.removeItem(id);
    }
  }

  goToCheckout() {
    this.cart.closeDrawer();
    this.router.navigate(['/checkout']);
  }
}
