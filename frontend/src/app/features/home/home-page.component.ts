import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { StoreService } from '../../core/services/store.service';
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
        <span class="eyebrow">Norzagaray, Bulacan</span>
        <h1><span class="line">Home</span><span class="line accent">by Bami</span></h1>
        <div class="hero-meta">
          <span>📍 {{ store.address() }}</span>
          <span>🕐 {{ store.todayHoursLabel() }}</span>
        </div>
        <div class="hero-actions">
          <a routerLink="/shop" class="btn btn-primary">View Menu →</a>
          <a routerLink="/contact" class="btn btn-secondary hero-btn-secondary">Find Us</a>
        </div>
        <a href="#discover" class="scroll-cue">Discover the Flavors</a>
      </div>
    </section>

    <section class="container featured" id="discover">
      <div class="featured-header">
        <div>
          <span class="eyebrow">Our Offerings</span>
          <h2>Discover the Flavors</h2>
        </div>
        <a routerLink="/shop" class="btn btn-secondary">Full Menu →</a>
      </div>
      <div class="grid-responsive">
        @for (p of featured(); track p.id) {
          <app-product-card [product]="p" (open)="activeProduct.set($event)" (quickAddToCart)="quickAdd($event)"></app-product-card>
        }
      </div>
    </section>

    <section class="promo">
      <div class="container promo-inner">
        <h2 class="promo-title">10% OFF Iced Mana — This Week Only</h2>
        <p>Use code <strong>CHILL10</strong> at checkout on any Iced Mana item.</p>
        <a routerLink="/shop" [queryParams]="{ category: 2 }" class="btn btn-primary">Shop Iced Mana</a>
      </div>
    </section>

    <section class="container testimonials">
      <h2>What Our Regulars Say</h2>
      <div class="quote-grid">
        <blockquote class="card">"Best croissants in the neighborhood — ordering ahead means I never miss picking mine up fresh." <cite>— Priya M.</cite></blockquote>
        <blockquote class="card">"The order tracker makes it so easy to time my walk over perfectly." <cite>— Daniel R.</cite></blockquote>
        <blockquote class="card">"Their sourdough loaves sell out fast — glad I can reserve mine online now." <cite>— Ana L.</cite></blockquote>
      </div>
    </section>

    <app-item-modal [product]="activeProduct()" (close)="activeProduct.set(null)" (addedToCart)="onAdded($event)"></app-item-modal>
  `,
  styles: [`
    .hero { background: linear-gradient(135deg, var(--color-text-chocolate), var(--color-terracotta-dark)); padding: 64px 0 40px; }
    .hero-inner { max-width: 640px; }
    .eyebrow { color: var(--color-terracotta); font-weight: 700; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; }
    .hero .eyebrow { color: rgba(255,255,255,0.85); }
    .hero h1 { margin: 8px 0 0; font-size: 44px; line-height: 1.05; color: var(--color-white); }
    .hero h1 .line { display: block; }
    .hero h1 .accent { color: var(--color-terracotta); }
    .hero-meta { display: flex; flex-direction: column; gap: 4px; color: var(--color-white); opacity: 0.9; font-size: 14px; margin: 16px 0 24px; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .hero-btn-secondary { background: transparent; color: var(--color-white); border-color: var(--color-white); }
    .hero-btn-secondary:hover { background: rgba(255,255,255,0.12); }
    .scroll-cue { display: inline-block; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.7); font-weight: 700; }

    .featured { margin: 48px auto 40px; }
    .featured-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .featured-header .eyebrow { color: var(--color-terracotta); }

    .promo { background: var(--color-sage-dark); margin: 40px 0; padding: 40px 0; border-radius: var(--radius-lg); }
    .promo-inner { text-align: center; color: var(--color-canvas-oat); }
    .promo-title { color: var(--color-canvas-oat); }
    .promo-inner p { margin-bottom: 20px; }

    .testimonials { margin: 40px auto 56px; }
    .quote-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .quote-grid { grid-template-columns: repeat(3, 1fr); } }
    blockquote { padding: 20px; margin: 0; font-style: italic; }
    cite { display: block; margin-top: 10px; font-style: normal; font-weight: 700; color: var(--color-terracotta); font-size: 13px; }

    @media (min-width: 640px) {
      .hero h1 { font-size: 56px; }
      .hero-meta { flex-direction: row; gap: 20px; }
    }
    @media (min-width: 960px) {
      .featured .grid-responsive { grid-template-columns: repeat(3, 1fr); }
    }
  `],
})
export class HomePageComponent {
  productService = inject(ProductService);
  cart = inject(CartService);
  store = inject(StoreService);
  activeProduct = signal<Product | null>(null);

  featured() {
    return this.productService.products().slice(0, 3);
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
