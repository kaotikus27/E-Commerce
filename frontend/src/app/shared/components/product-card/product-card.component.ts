import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../core/models/product.model';
import { BadgeComponent } from '../badge/badge.component';
import { toAbsoluteImageUrl } from '../../../core/utils/image-url.util';

const BADGE_TONES: Record<string, 'sale' | 'favorite' | 'bestseller'> = {
  'Fan Favorite': 'favorite',
  'Fresh Baked': 'favorite',
  'New': 'favorite',
  'Best Seller': 'bestseller',
};

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    @if (layout === 'list') {
      <article class="product-row card" [class.sold-out]="!product.available" (click)="open.emit(product)">
        <div class="thumb">
          <img [src]="imageUrl" [alt]="product.name" loading="lazy" />
          @if (!product.available) {
            <div class="sold-out-overlay">Sold Out</div>
          }
        </div>
        <div class="info">
          <span class="category">{{ product.categoryName }}</span>
          <h3 class="title">{{ product.name }}</h3>
          <p class="desc">{{ product.description }}</p>
          <div class="row">
            <span class="price">₱{{ product.price.toFixed(2) }}</span>
            <button
              class="btn btn-primary btn-sm add-btn"
              [disabled]="!product.available"
              (click)="quickAdd($event)"
              [attr.aria-label]="(product.available ? 'Add ' : 'Sold out: ') + product.name + (product.available ? ' to cart' : '')">
              {{ product.available ? 'Add to Cart' : 'Sold Out' }}
            </button>
          </div>
        </div>
      </article>
    } @else if (layout === 'menu') {
      <article
        class="menu-row"
        [class.sold-out]="!product.available"
        [class.highlight]="product.available && product.badges.length > 0"
        (click)="open.emit(product)">
        <div class="thumb menu-thumb">
          <img [src]="imageUrl" [alt]="product.name" loading="lazy" />
        </div>
        <div class="menu-info">
          <div class="menu-info-top">
            <h3 class="menu-title">{{ product.name }}</h3>
            <span class="menu-price">{{ product.available ? '₱' + product.price.toFixed(2) : 'Sold Out' }}</span>
          </div>
          <p class="desc">{{ product.description }}</p>
          @if (product.badges.length) {
            <div class="menu-badges">
              @for (b of product.badges; track b) {
                <app-badge [text]="b" [tone]="badgeTone(b)"></app-badge>
              }
            </div>
          }
        </div>
      </article>
    } @else {
      <article class="product-card card" [class.sold-out]="!product.available" (click)="open.emit(product)">
        <div class="thumb">
          <img [src]="imageUrl" [alt]="product.name" loading="lazy" />
          @if (!product.available) {
            <div class="sold-out-overlay">Sold Out for Today</div>
          }
          @if (product.badges.length) {
            <div class="badges">
              @for (b of product.badges; track b) {
                <app-badge [text]="b" [tone]="badgeTone(b)"></app-badge>
              }
            </div>
          }
        </div>
        <div class="info">
          <h3 class="title">{{ product.name }}</h3>
          <p class="desc">{{ product.description }}</p>
          <div class="row">
            <span class="price">₱{{ product.price.toFixed(2) }}</span>
            <button
              class="add-icon-btn"
              [disabled]="!product.available"
              (click)="quickAdd($event)"
              [attr.aria-label]="(product.available ? 'Add ' : 'Sold out: ') + product.name + (product.available ? ' to cart' : '')">
              +
            </button>
          </div>
        </div>
      </article>
    }
  `,
  styles: [`
    .product-card, .product-row, .menu-row {
      overflow: hidden;
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease;
    }
    .product-card:hover, .product-row:hover { transform: translateY(-3px); box-shadow: var(--shadow-elevated); }
    .menu-row:hover .menu-title { color: var(--color-terracotta); }
    .sold-out .thumb img { opacity: 0.5; }
    .thumb { position: relative; flex-shrink: 0; overflow: hidden; background: var(--color-subdued-pistachio); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .sold-out-overlay {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(44, 29, 17, 0.35); color: var(--color-white); font-weight: 700; font-size: 13px;
      text-align: center; padding: 8px;
    }

    /* Grid card (home page) */
    .product-card { display: flex; flex-direction: column; }
    .product-card .thumb { aspect-ratio: 4/3; }
    .badges { position: absolute; top: 8px; left: 8px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .product-card .info { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .product-card .title { font-size: 16px; margin: 0; line-height: 1.25; }
    .desc { font-size: 13px; color: var(--color-text-muted); margin: 0; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .product-card .row { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 8px; }
    .price { font-weight: 700; color: var(--color-text-chocolate); font-size: 15px; }
    .add-icon-btn {
      flex-shrink: 0; width: 44px; height: 44px; min-width: 44px; min-height: 44px;
      border-radius: 50%; border: none; background: var(--color-terracotta); color: var(--color-white);
      font-size: 20px; font-weight: 700; line-height: 1; display: flex; align-items: center; justify-content: center;
    }
    .add-icon-btn:hover:not(:disabled) { background: var(--color-terracotta-dark); }
    .add-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* List row (menu/product page) */
    .product-row { display: flex; gap: 16px; padding: 16px; }
    .product-row .thumb { width: 120px; height: 120px; border-radius: var(--radius-sm); }
    .product-row .info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .category { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-terracotta); }
    .product-row .title { font-size: 17px; margin: 0; }
    .product-row .row { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 6px; gap: 12px; }
    .add-btn { padding: 0 16px; flex-shrink: 0; }

    @media (min-width: 640px) {
      .product-row .thumb { width: 160px; height: 160px; }
    }

    /* Menu row (Product page, grouped-by-category layout) */
    .menu-row { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--color-border-subtle); }
    .menu-row:last-child { border-bottom: none; }
    .menu-row.highlight {
      border: 1.5px dashed var(--color-terracotta); border-radius: var(--radius-md);
      padding: 14px; background: rgba(184, 90, 42, 0.05); margin: 4px 0;
    }
    .menu-row.highlight:last-child { border-bottom: 1.5px dashed var(--color-terracotta); }
    .menu-thumb { width: 60px; height: 60px; border-radius: 50%; }
    .menu-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .menu-info-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .menu-title { font-size: 16px; margin: 0; }
    .menu-price { font-weight: 700; color: var(--color-terracotta); white-space: nowrap; font-size: 14px; }
    .menu-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
  `],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() layout: 'grid' | 'list' | 'menu' = 'grid';
  @Output() open = new EventEmitter<Product>();
  @Output() quickAddToCart = new EventEmitter<Product>();

  get imageUrl() {
    return toAbsoluteImageUrl(this.product.image);
  }

  badgeTone(text: string): 'default' | 'sale' | 'favorite' | 'bestseller' {
    if (text.includes('OFF')) return 'sale';
    return BADGE_TONES[text] ?? 'default';
  }

  quickAdd(evt: Event) {
    evt.stopPropagation();
    if (!this.product.available) return;
    this.quickAddToCart.emit(this.product);
  }
}
