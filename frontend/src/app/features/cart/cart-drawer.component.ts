import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { StoreService } from '../../core/services/store.service';
import { PickupTimePickerComponent } from './pickup-time-picker.component';
import { ChibiMascotComponent } from '../../shared/components/chibi-mascot/chibi-mascot.component';
import { toAbsoluteImageUrl } from '../../core/utils/image-url.util';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, PickupTimePickerComponent, ChibiMascotComponent],
  template: `
    @if (cart.isDrawerOpen()) {
      <div class="drawer-backdrop" (click)="cart.closeDrawer()">
        <aside class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h3>Your Cart</h3>
            <button class="close-btn" (click)="cart.closeDrawer()" aria-label="Close cart">✕</button>
          </div>

          @if (cart.isEmpty()) {
            <div class="empty">
              <app-chibi-mascot [size]="88" label="Empty cart mascot"></app-chibi-mascot>
              <p>Your cart is empty. Add something delicious!</p>
            </div>
          } @else {
            <div class="items">
              @for (item of cart.items(); track item.id) {
                <div class="cart-item card">
                  <img [src]="toAbsoluteImageUrl(item.product.image)" [alt]="item.product.name" />
                  <div class="item-info">
                    <strong>{{ item.product.name }}</strong>
                    @if (item.selectedOptions.length) {
                      <span class="opts">{{ optionsLabel(item) }}</span>
                    }
                    <div class="qty-row">
                      <button class="qty-btn" (click)="cart.updateQuantity(item.id, item.quantity - 1)" aria-label="Decrease quantity">−</button>
                      <span>{{ item.quantity }}</span>
                      <button class="qty-btn" (click)="cart.updateQuantity(item.id, item.quantity + 1)" aria-label="Increase quantity">+</button>
                    </div>
                  </div>
                  <div class="item-right">
                    <span class="line-total">₱{{ item.lineTotal.toFixed(2) }}</span>
                    <button class="remove-btn" (click)="confirmRemove(item.id)" aria-label="Remove item">🗑</button>
                  </div>
                </div>
              }
            </div>

            <app-pickup-time-picker (timeSelected)="cart.setPickupTime($event)"></app-pickup-time-picker>

            <div class="summary">
              <div class="summary-row"><span>Subtotal</span><span>₱{{ cart.subtotal().toFixed(2) }}</span></div>
              <div class="summary-row"><span>Tax</span><span>₱{{ cart.tax().toFixed(2) }}</span></div>
              <div class="summary-row total"><span>Total</span><span>₱{{ cart.total().toFixed(2) }}</span></div>
            </div>

            <button class="btn btn-primary btn-block" [disabled]="!store.isOpen()" (click)="goToCheckout()">
              {{ store.isOpen() ? 'Proceed to Checkout' : "We're Closed Right Now" }}
            </button>
          }
        </aside>
      </div>
    }
  `,
  styles: [`
    .drawer-backdrop { position: fixed; inset: 0; background: var(--color-backdrop); z-index: 800; display: flex; justify-content: flex-end; }
    .drawer {
      background: var(--color-canvas-oat); width: 100%; max-width: 400px; height: 100%; overflow-y: auto;
      padding: 20px; animation: slideIn .2s ease; display: flex; flex-direction: column;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .close-btn { background: none; border: none; font-size: 18px; min-width: 44px; min-height: 44px; }
    .empty { color: var(--color-text-chocolate); text-align: center; margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .items { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
    .cart-item { display: flex; gap: 10px; padding: 10px; }
    .cart-item img { width: 56px; height: 56px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .opts { font-size: 12px; color: var(--color-sage-700); }
    .qty-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .qty-btn { background: var(--color-subdued-pistachio); border: none; border-radius: var(--radius-pill); width: 48px; height: 48px; font-size: 18px; font-weight: 700; min-height: unset; }
    .item-right { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; }
    .line-total { font-weight: 700; color: var(--color-text-chocolate); }
    .remove-btn { background: none; border: none; font-size: 16px; min-width: 48px; min-height: 48px; }
    .summary { border-top: 1.5px dashed var(--color-subdued-pistachio); padding-top: 12px; margin-bottom: 16px; }
    .summary-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
    .summary-row.total { font-weight: 700; font-size: 16px; color: var(--color-text-chocolate); }
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
