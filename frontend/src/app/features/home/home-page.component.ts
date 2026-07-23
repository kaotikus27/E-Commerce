import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product.model';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ItemModalComponent } from '../catalog/components/item-modal.component';
import { SelectedOption } from '../../core/models/cart.model';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, ItemModalComponent],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <span class="eyebrow">Fresh Daily · Baked with Care</span>
        <h1>Order Ahead. Skip the Line.</h1>
        <p>Bread, pastries & coffee from our oven to your hands — ready when you are.</p>
        <div class="hero-actions">
          <a routerLink="/shop" class="btn btn-primary">Order Now</a>
          <a routerLink="/about" class="btn btn-secondary">Our Story</a>
        </div>
      </div>
    </section>

    <section class="container shortcuts">
      @for (c of productService.categories(); track c.id) {
        <a [routerLink]="['/shop']" [queryParams]="{ category: c.id }" class="shortcut-card">
          <span class="icon">{{ c.icon }}</span>
          <span>{{ c.name }}</span>
        </a>
      }
    </section>

    <section class="container featured">
      <h2>Trending This Week</h2>
      <div class="grid-responsive">
        @for (p of featured(); track p.id) {
          <app-product-card [product]="p" (open)="activeProduct.set($event)" (quickAddToCart)="quickAdd($event)"></app-product-card>
        }
      </div>
    </section>

    <section class="promo">
      <div class="container promo-inner">
        <h2 style="color: var(--color-cream)">10% OFF Cold Brew — This Week Only</h2>
        <p>Use code <strong>CHILL10</strong> at checkout on any Cold Brew item.</p>
        <a routerLink="/shop" [queryParams]="{ category: 2 }" class="btn btn-primary">Shop Cold Brew</a>
      </div>
    </section>

    <section class="container testimonials">
      <h2>What Customers Say</h2>
      <div class="quote-grid">
        <blockquote>"Best croissants in the neighborhood, and ordering ahead saves me every morning." <cite>— Priya M.</cite></blockquote>
        <blockquote>"The pickup tracker is so handy — I time my walk perfectly." <cite>— Daniel R.</cite></blockquote>
        <blockquote>"Their sourdough sells out fast, glad I can reserve mine online now." <cite>— Ana L.</cite></blockquote>
      </div>
    </section>

    <app-item-modal [product]="activeProduct()" (close)="activeProduct.set(null)" (addedToCart)="onAdded($event)"></app-item-modal>
  `,
  styles: [`
    .hero { background: linear-gradient(135deg, var(--color-pistachio), var(--color-cream)); padding: 56px 0; }
    .hero-inner { max-width: 640px; }
    .eyebrow { color: var(--color-sage-700); font-weight: 700; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; }
    .hero h1 { font-size: 32px; margin-top: 8px; }
    .hero p { color: var(--color-charcoal); font-size: 16px; margin-bottom: 20px; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }

    .shortcuts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 32px auto; }
    @media (min-width: 640px) { .shortcuts { grid-template-columns: repeat(4, 1fr); } }
    .shortcut-card {
      background: var(--color-white); border-radius: var(--radius-md); box-shadow: var(--shadow-card);
      display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 8px; font-weight: 700;
      color: var(--color-espresso);
    }
    .icon { font-size: 28px; }

    .featured { margin: 40px auto; }

    .promo { background: var(--color-sage-dark); margin: 40px 0; padding: 40px 0; }
    .promo-inner { text-align: center; color: var(--color-cream); }
    .promo-inner p { margin-bottom: 20px; }

    .testimonials { margin: 40px auto 56px; }
    .quote-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .quote-grid { grid-template-columns: repeat(3, 1fr); } }
    blockquote { background: var(--color-white); border-radius: var(--radius-md); box-shadow: var(--shadow-card); padding: 20px; margin: 0; font-style: italic; }
    cite { display: block; margin-top: 10px; font-style: normal; font-weight: 700; color: var(--color-sage-700); font-size: 13px; }
  `],
})
export class HomePageComponent {
  productService = inject(ProductService);
  cart = inject(CartService);
  activeProduct = signal<Product | null>(null);

  featured() {
    return this.productService.products().slice(0, 4);
  }

  quickAdd(product: Product) {
    if (product.customizations.length) {
      this.activeProduct.set(product);
      return;
    }
    this.cart.addItem(product, 1, []);
  }

  onAdded(e: { product: Product; quantity: number; options: SelectedOption[] }) {
    this.cart.addItem(e.product, e.quantity, e.options);
  }
}
