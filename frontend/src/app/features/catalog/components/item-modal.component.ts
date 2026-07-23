import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../core/models/product.model';
import { SelectedOption } from '../../../core/models/cart.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <app-modal [open]="!!product" [title]="product?.name || ''" (close)="close.emit()">
      @if (product) {
        <img [src]="product.image" [alt]="product.name" class="hero-img" />
        <p class="desc">{{ product.description }}</p>

        @for (custom of product.customizations; track custom.name) {
          <div class="field">
            <label>{{ custom.name }}{{ custom.required ? ' *' : '' }}</label>
            <select [(ngModel)]="selections[custom.name]" [name]="custom.name">
              @for (opt of custom.options; track opt) {
                <option [value]="opt">{{ opt }}</option>
              }
            </select>
          </div>
        }

        <div class="qty-row">
          <span>Quantity</span>
          <div class="qty-controls">
            <button class="btn btn-secondary btn-sm" (click)="decrement()" aria-label="Decrease quantity">−</button>
            <span class="qty-val">{{ quantity }}</span>
            <button class="btn btn-secondary btn-sm" (click)="increment()" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <button class="btn btn-primary btn-block" (click)="addToCart()">
          Add to Cart — \${{ (product.price * quantity).toFixed(2) }}
        </button>
      }
    </app-modal>
  `,
  styles: [`
    .hero-img { width: 100%; aspect-ratio: 16/10; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 12px; }
    .desc { color: var(--color-charcoal); font-size: 14px; line-height: 1.5; margin-bottom: 16px; }
    .qty-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; font-weight: 600; }
    .qty-controls { display: flex; align-items: center; gap: 12px; }
    .qty-val { min-width: 24px; text-align: center; font-weight: 700; }
  `],
})
export class ItemModalComponent implements OnChanges {
  @Input() product: Product | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() addedToCart = new EventEmitter<{ product: Product; quantity: number; options: SelectedOption[] }>();

  quantity = 1;
  selections: Record<string, string> = {};

  ngOnChanges() {
    this.quantity = 1;
    this.selections = {};
    this.product?.customizations.forEach(c => {
      this.selections[c.name] = c.options[0];
    });
  }

  increment() { this.quantity++; }
  decrement() { if (this.quantity > 1) this.quantity--; }

  addToCart() {
    if (!this.product) return;
    const options: SelectedOption[] = Object.entries(this.selections).map(([name, value]) => ({ name, value }));
    this.addedToCart.emit({ product: this.product, quantity: this.quantity, options });
    this.close.emit();
  }
}
