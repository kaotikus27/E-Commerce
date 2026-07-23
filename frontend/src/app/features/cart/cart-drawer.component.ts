import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { PickupTimePickerComponent } from './pickup-time-picker.component';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, PickupTimePickerComponent],
  template: `
    @if (cart.isDrawerOpen()) {
      <div class="drawer-backdrop" (click)="cart.closeDrawer()">
        <aside class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h3>Your Order</h3>
            <button class="close-btn" (click)="cart.closeDrawer()" aria-label="Close cart">✕</button>
          </div>

          @if (cart.isEmpty()) {
            <p class="empty">Your cart is empty. Add something delicious!</p>
          } @else {
            <div class="items">
              @for (item of cart.items(); track item.id) {
                <div class="cart-item">
                  <img [src]="item.product.image" [alt]="item.product.name" />
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
                    <span class="line-total">\${{ item.lineTotal.toFixed(2) }}</span>
                    <button class="remove-btn" (click)="confirmRemove(item.id)" aria-label="Remove item">🗑</button>
                  </div>
                </div>
              }
            </div>

            <app-pickup-time-picker></app-pickup-time-picker>

            <div class="summary">
              <div class="summary-row"><span>Subtotal</span><span>\${{ cart.subtotal().toFixed(2) }}</span></div>
              <div class="summary-row"><span>Tax</span><span>\${{ cart.tax().toFixed(2) }}</span></div>
              <div class="summary-row total"><span>Total</span><span>\${{ cart.total().toFixed(2) }}</span></div>
            </div>

            <button class="btn btn-primary btn-block" (click)="goToCheckout()">Proceed to Checkout</button>
          }
        </aside>
      </div>
    }
  `,
  styles: [`
    .drawer-backdrop { position: fixed; inset: 0; background: rgba(43,43,43,0.5); z-index: 800; display: flex; justify-content: flex-end; }
    .drawer {
      background: var(--color-cream); width: 100%; max-width: 400px; height: 100%; overflow-y: auto;
      padding: 20px; animation: slideIn .2s ease; display: flex; flex-direction: column;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .close-btn { background: none; border: none; font-size: 18px; min-width: 44px; min-height: 44px; }
    .empty { color: var(--color-charcoal); text-align: center; margin-top: 40px; }
    .items { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
    .cart-item { display: flex; gap: 10px; background: var(--color-white); border-radius: var(--radius-sm); padding: 10px; }
    .cart-item img { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .opts { font-size: 12px; color: var(--color-sage-700); }
    .qty-row { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
    .qty-btn { background: var(--color-pistachio); border: none; border-radius: 6px; width: 28px; height: 28px; font-weight: 700; min-height: unset; }
    .item-right { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; }
    .line-total { font-weight: 700; color: var(--color-espresso); }
    .remove-btn { background: none; border: none; font-size: 14px; min-width: 32px; min-height: 32px; }
    .summary { border-top: 1.5px dashed var(--color-pistachio); padding-top: 12px; margin-bottom: 16px; }
    .summary-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
    .summary-row.total { font-weight: 700; font-size: 16px; color: var(--color-espresso); }
  `],
})
export class CartDrawerComponent {
  cart = inject(CartService);
  router = inject(Router);

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
