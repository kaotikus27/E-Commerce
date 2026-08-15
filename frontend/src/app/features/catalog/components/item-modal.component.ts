import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../core/models/product.model';
import { SelectedOption } from '../../../core/models/cart.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { toAbsoluteImageUrl } from '../../../core/utils/image-url.util';

@Component({
  selector: 'app-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <app-modal [open]="!!product" [title]="product?.name || ''" (close)="close.emit()">
      @if (product) {
        <img [src]="toAbsoluteImageUrl(product.image)" [alt]="product.name" class="hero-img" />
        @if (!product.available) {
          <p class="sold-out-notice">Sold out for today — check back tomorrow!</p>
        }
        <p class="desc">{{ product.description }}</p>

        @for (custom of product.customizations; track custom.name) {
          <div class="field">
            <label>{{ custom.name }}{{ custom.required ? ' *' : '' }}</label>
            <select [(ngModel)]="selections[custom.name]" [name]="custom.name">
              @for (opt of custom.options; track opt.name) {
                <option [value]="opt.name">{{ opt.name }}{{ opt.priceDelta ? ' (+₱' + opt.priceDelta.toFixed(2) + ')' : '' }}</option>
              }
            </select>
          </div>
        }

        <div class="qty-row">
          <span>Quantity</span>
          <div class="qty-controls">
            <button class="btn btn-secondary qty-btn" (click)="decrement()" aria-label="Decrease quantity">−</button>
            <span class="qty-val">{{ quantity }}</span>
            <button class="btn btn-secondary qty-btn" (click)="increment()" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <button class="btn btn-primary btn-block" [disabled]="!product.available" (click)="addToCart()">
          {{ product.available ? 'Add to Cart — ₱' + ((product.price + selectedOptionsDelta()) * quantity).toFixed(2) : 'Sold Out for Today' }}
        </button>
      }
    </app-modal>
  `,
  styles: [`
    .hero-img { width: 100%; aspect-ratio: 16/10; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 12px; }
    .sold-out-notice { color: var(--color-status-closed); font-weight: 700; font-size: 13px; margin-bottom: 8px; }
    .desc { color: var(--color-text-chocolate); font-size: 14px; line-height: 1.5; margin-bottom: 16px; }
    .qty-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; font-weight: 600; }
    .qty-controls { display: flex; align-items: center; gap: 12px; }
    .qty-btn { min-width: 48px; min-height: 48px; padding: 0; }
    .qty-val { min-width: 24px; text-align: center; font-weight: 700; }
  `],
})
export class ItemModalComponent implements OnChanges {
  @Input() product: Product | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() addedToCart = new EventEmitter<{ product: Product; quantity: number; options: SelectedOption[] }>();

  quantity = 1;
  selections: Record<string, string> = {};
  toAbsoluteImageUrl = toAbsoluteImageUrl;

  ngOnChanges() {
    this.quantity = 1;
    this.selections = {};
    this.product?.customizations.forEach(c => {
      this.selections[c.name] = c.options[0]?.name ?? '';
    });
  }

  increment() { this.quantity++; }
  decrement() { if (this.quantity > 1) this.quantity--; }

  /** Sum of the currently selected option's priceDelta across every customization. */
  selectedOptionsDelta(): number {
    if (!this.product) return 0;
    return this.product.customizations.reduce((sum, custom) => {
      const selectedName = this.selections[custom.name];
      const option = custom.options.find(o => o.name === selectedName);
      return sum + (option?.priceDelta ?? 0);
    }, 0);
  }

  addToCart() {
    if (!this.product || !this.product.available) return;
    const options: SelectedOption[] = this.product.customizations.map(custom => {
      const value = this.selections[custom.name];
      const priceDelta = custom.options.find(o => o.name === value)?.priceDelta ?? 0;
      return { name: custom.name, value, priceDelta };
    });
    this.addedToCart.emit({ product: this.product, quantity: this.quantity, options });
    this.close.emit();
  }
}
