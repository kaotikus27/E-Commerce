import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../core/models/product.model';
import { BadgeComponent } from '../badge/badge.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <article class="product-card" (click)="open.emit(product)">
      <div class="thumb">
        <img [src]="product.image" [alt]="product.name" loading="lazy" />
        @if (product.badges.length) {
          <div class="badges">
            @for (b of product.badges; track b) {
              <app-badge [text]="b" [tone]="b.includes('OFF') ? 'sale' : 'default'"></app-badge>
            }
          </div>
        }
      </div>
      <div class="info">
        <h3 class="title">{{ product.name }}</h3>
        <div class="rating">★ {{ product.rating.toFixed(1) }}</div>
        <div class="row">
          <span class="price">\${{ product.price.toFixed(2) }}</span>
          <button class="btn btn-primary btn-sm add-btn" (click)="quickAdd($event)" [attr.aria-label]="'Add ' + product.name + ' to cart'">
            + Add
          </button>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .product-card {
      background: var(--color-white);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease;
      display: flex;
      flex-direction: column;
    }
    .product-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-elevated); }
    .thumb { position: relative; aspect-ratio: 4/3; overflow: hidden; background: var(--color-pistachio); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .badges { position: absolute; top: 8px; left: 8px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .info { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .title { font-size: 15px; margin: 0; line-height: 1.25; }
    .rating { font-size: 12px; color: var(--color-sage-700); font-weight: 600; }
    .row { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 6px; }
    .price { font-weight: 700; color: var(--color-espresso); font-size: 15px; }
    .add-btn { padding: 0 12px; }
  `],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Output() open = new EventEmitter<Product>();
  @Output() quickAddToCart = new EventEmitter<Product>();

  quickAdd(evt: Event) {
    evt.stopPropagation();
    this.quickAddToCart.emit(this.product);
  }
}
