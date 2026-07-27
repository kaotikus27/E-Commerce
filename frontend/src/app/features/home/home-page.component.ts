import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { PromotionService } from '../../core/services/promotion.service';
import { Product } from '../../core/models/product.model';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ItemModalComponent } from '../catalog/components/item-modal.component';
import { SelectedOption } from '../../core/models/cart.model';
import { FaqService } from '../../core/services/faq.service';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, ItemModalComponent, FaqAccordionComponent],
  template: `
    <section class="hero">
      <img src="assets/hero.png" alt="Home by Bami storefront" class="hero-photo" />
      <div class="hero-bar">
        <div class="hero-actions">
          <a routerLink="/shop" class="btn btn-primary">Order Now →</a>
          <button class="btn btn-secondary hero-btn-secondary" (click)="cart.toggleDrawer()">View Cart</button>
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

    @for (promo of promotionService.promotions(); track promo.id) {
      <section class="promo">
        <div class="container promo-inner">
          <h2 class="promo-title">{{ promo.title }}</h2>
          @if (promo.description) {
            <p>{{ promo.description }}</p>
          }
          @if (promo.buttonLabel && promo.buttonLink) {
            <a [href]="promo.buttonLink" (click)="goTo($event, promo.buttonLink!)" class="btn btn-primary">{{ promo.buttonLabel }}</a>
          }
        </div>
      </section>
    }

    <section class="container testimonials">
      <h2>What Our Regulars Say</h2>
      <div class="quote-grid">
        <blockquote class="card">"Best croissants in the neighborhood — ordering ahead means I never miss picking mine up fresh." <cite>— Priya M.</cite></blockquote>
        <blockquote class="card">"The order tracker makes it so easy to time my walk over perfectly." <cite>— Daniel R.</cite></blockquote>
        <blockquote class="card">"Their sourdough loaves sell out fast — glad I can reserve mine online now." <cite>— Ana L.</cite></blockquote>
      </div>
    </section>

    <section class="container faq-section">
      <h2>Frequently Asked Questions</h2>
      <app-faq-accordion [faqs]="faqService.faqs()"></app-faq-accordion>
    </section>

    <app-item-modal [product]="activeProduct()" (close)="activeProduct.set(null)" (addedToCart)="onAdded($event)"></app-item-modal>
  `,
  styles: [`
    .hero-photo { width: 100%; height: auto; display: block; }
    .hero-bar {
      background: var(--color-text-chocolate); padding: 20px 16px;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .eyebrow { color: var(--color-terracotta); font-weight: 700; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
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

    .faq-section { margin: 0 auto 56px; max-width: 720px; }

    @media (min-width: 960px) {
      .featured .grid-responsive { grid-template-columns: repeat(3, 1fr); }
    }
  `],
})
export class HomePageComponent {
  productService = inject(ProductService);
  cart = inject(CartService);
  promotionService = inject(PromotionService);
  faqService = inject(FaqService);
  router = inject(Router);
  activeProduct = signal<Product | null>(null);

  featured() {
    return this.productService.products().slice(0, 3);
  }

  goTo(event: Event, link: string) {
    event.preventDefault();
    this.router.navigateByUrl(link);
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
