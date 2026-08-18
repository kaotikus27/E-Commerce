import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../core/models/product.model';
import { SelectedOption } from '../../../core/models/cart.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { toAbsoluteImageUrl } from '../../../core/utils/image-url.util';

const BADGE_TONES: Record<string, 'sale' | 'favorite' | 'bestseller'> = {
  'Fan Favorite': 'favorite',
  'Fresh Baked': 'favorite',
  'New': 'favorite',
  'Best Seller': 'bestseller',
};

/** Mirrors the backend's OrderService.GIFT_WRAP_FEE — display-only estimate; the backend
 *  recalculates authoritatively at checkout, same as customization surcharges already do. */
const GIFT_WRAP_FEE = 20.00;

@Component({
  selector: 'app-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, BadgeComponent],
  template: `
    <app-modal [open]="!!product" [title]="product?.name || ''" panelClass="themed-card" backdropClass="themed-backdrop" (close)="close.emit()">
      @if (product) {
        <img modalDecoration src="assets/soot-sprite.png" alt="" aria-hidden="true" class="soot-sprite-peek" />
      }
      @if (product) {
        <img src="assets/vines-accent.png" alt="" aria-hidden="true" class="vines-accent" />
        <img [src]="toAbsoluteImageUrl(product.image)" [alt]="product.name" class="hero-img" />

        <div class="title-row">
          <span class="price">₱{{ product.price.toFixed(2) }}</span>
          @if (product.badges.length) {
            <div class="badges">
              @for (b of product.badges; track b) {
                <app-badge [text]="b" [tone]="badgeTone(b)"></app-badge>
              }
            </div>
          }
        </div>

        @if (!product.available) {
          <p class="sold-out-notice">Sold out for today — check back tomorrow!</p>
        }
        <p class="desc">{{ product.description }}</p>

        @for (custom of product.customizations; track custom.name) {
          <div class="field">
            <label>{{ custom.name }}{{ custom.required ? ' *' : '' }}</label>
            @if (hasPricedOptions(custom)) {
              <div class="option-list">
                @for (opt of custom.options; track opt.name) {
                  <label class="option-row" [class.selected]="selections[custom.name] === opt.name">
                    <span class="option-row-left">
                      <input type="radio" [name]="custom.name" [value]="opt.name" [(ngModel)]="selections[custom.name]" />
                      {{ opt.name }}
                    </span>
                    @if (opt.priceDelta) {
                      <span class="option-price">+₱{{ opt.priceDelta.toFixed(2) }}</span>
                    }
                  </label>
                }
              </div>
            } @else {
              <div class="pill-group">
                @for (opt of custom.options; track opt.name) {
                  <button
                    type="button"
                    class="pill"
                    [class.active]="selections[custom.name] === opt.name"
                    (click)="selections[custom.name] = opt.name">
                    {{ opt.name }}
                  </button>
                }
              </div>
            }
          </div>
        }

        <label class="gift-wrap-row">
          <input type="checkbox" [(ngModel)]="giftWrap" name="giftWrap" />
          Add Gift Wrap (+₱{{ giftWrapFee.toFixed(2) }})
        </label>

        <div class="qty-row">
          <span>Quantity</span>
          <div class="qty-controls">
            <button class="btn btn-secondary qty-btn" (click)="decrement()" aria-label="Decrease quantity">−</button>
            <span class="qty-val">{{ quantity }}</span>
            <button class="btn btn-secondary qty-btn" (click)="increment()" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <button class="btn btn-primary btn-block" [disabled]="!product.available" (click)="addToCart()">
          {{ product.available ? 'Add to Cart — ₱' + ((product.price + selectedOptionsDelta() + (giftWrap ? giftWrapFee : 0)) * quantity).toFixed(2) : 'Sold Out for Today' }}
        </button>
      }
    </app-modal>
  `,
  styles: [`
    /* Bespoke palette for this card, per Leo's design spec — not the site's global tokens. */
    .soot-sprite-peek {
      position: absolute; top: -34px; right: 18px; width: 52px; height: auto;
      z-index: -1; pointer-events: none;
    }
    .vines-accent { width: 44px; height: 46px; margin-bottom: 8px; opacity: 0.85; }
    .hero-img { width: 100%; aspect-ratio: 16/10; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 12px; }
    .title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .price { font-weight: 700; font-size: 18px; color: #6F4E37; }
    .badges { display: flex; gap: 6px; }
    .sold-out-notice { color: var(--color-status-closed); font-weight: 700; font-size: 13px; margin-bottom: 8px; }
    .desc { color: #6F4E37; font-size: 14px; line-height: 1.5; margin-bottom: 16px; }

    .field { margin-bottom: 16px; }
    .field > label { display: block; font-weight: 700; font-size: 13px; margin-bottom: 8px; color: #2E4A3B; }

    .pill-group { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill {
      border: 1.5px solid #6F4E37; background: #F7F3E9;
      border-radius: var(--radius-pill); padding: 8px 16px; font-size: 13px; font-weight: 600;
      color: #6F4E37; min-height: 44px;
    }
    .pill.active { background: #2E4A3B; border-color: #2E4A3B; color: #F7F3E9; }

    .option-list { display: flex; flex-direction: column; gap: 8px; }
    .option-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      border: 1.5px solid #D9C89A; border-radius: var(--radius-sm);
      padding: 10px 14px; font-size: 14px; font-weight: 600; min-height: 44px; color: #6F4E37;
    }
    .option-row.selected { border-color: #6F4E37; background: rgba(111, 78, 55, 0.08); }
    .option-row-left { display: flex; align-items: center; gap: 10px; }
    .option-price { color: #D96B43; font-weight: 700; font-size: 13px; }

    .gift-wrap-row {
      display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600;
      margin-bottom: 16px; min-height: 44px; color: #6F4E37;
    }

    .qty-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; font-weight: 600; color: #2E4A3B; }
    .qty-controls { display: flex; align-items: center; gap: 12px; }
    .btn.qty-btn {
      min-width: 48px; min-height: 48px; padding: 0;
      background: #6F4E37; border: none; color: #F7F3E9;
    }
    .btn.qty-btn:hover { background: #5a3e2c; }
    .qty-val { min-width: 24px; text-align: center; font-weight: 700; color: #2E4A3B; }

    .btn.btn-block { background: #D96B43; color: #FFFFFF; border: none; }
    .btn.btn-block:hover:not(:disabled) { background: #c15a35; }
  `],
})
export class ItemModalComponent implements OnChanges {
  @Input() product: Product | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() addedToCart = new EventEmitter<{ product: Product; quantity: number; options: SelectedOption[]; giftWrap: boolean }>();

  quantity = 1;
  selections: Record<string, string> = {};
  giftWrap = false;
  giftWrapFee = GIFT_WRAP_FEE;
  toAbsoluteImageUrl = toAbsoluteImageUrl;

  ngOnChanges() {
    this.quantity = 1;
    this.selections = {};
    this.giftWrap = false;
    this.product?.customizations.forEach(c => {
      this.selections[c.name] = c.options[0]?.name ?? '';
    });
  }

  increment() { this.quantity++; }
  decrement() { if (this.quantity > 1) this.quantity--; }

  hasPricedOptions(custom: { options: { priceDelta: number }[] }): boolean {
    return custom.options.some(o => o.priceDelta > 0);
  }

  badgeTone(text: string): 'default' | 'sale' | 'favorite' | 'bestseller' {
    if (text.includes('OFF')) return 'sale';
    return BADGE_TONES[text] ?? 'default';
  }

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
    this.addedToCart.emit({ product: this.product, quantity: this.quantity, options, giftWrap: this.giftWrap });
    this.close.emit();
  }
}
