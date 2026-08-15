import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { PromotionService } from '../../core/services/promotion.service';
import { StoreService } from '../../core/services/store.service';
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
    <section class="hero container">
      <div class="hero-media">
        <video
          #heroVideo
          class="hero-photo"
          src="assets/homepage_hero_video.mp4"
          preload="metadata"
          loop
          autoplay
          playsinline
          [muted]="heroMuted()"
          (click)="heroVideo.paused ? heroVideo.play() : heroVideo.pause()"
          (play)="heroPlaying.set(true)"
          (pause)="heroPlaying.set(false)"
        ></video>
        @if (!heroPlaying()) {
          <button class="play-btn" (click)="heroVideo.play()" aria-label="Play video">
            <span class="play-triangle"></span>
          </button>
        }
        <button class="mute-btn" (click)="heroMuted.set(!heroMuted())" [attr.aria-label]="heroMuted() ? 'Unmute video' : 'Mute video'">
          {{ heroMuted() ? '🔇' : '🔊' }}
        </button>
        <!-- The source video has a baked-in AI-generation watermark, bottom-right — hidden by
             scaling/shifting the video itself so that corner sits outside the clipped viewport
             (see .hero-photo's transform), with a subtle bottom vignette as a second layer in case
             the crop alone doesn't fully clear it. -->
        <div class="hero-vignette"></div>
        <div class="hero-overlay">
          <div class="hero-info">
            <p class="hero-address">📍 {{ store.address() }}</p>
            <p class="hero-hours">Open Today · {{ store.todayHoursLabel() }}</p>
          </div>
        </div>
        <!-- Sized and anchored flush to the exact corner (no gap) specifically to sit on top of
             the watermark discussed above — a real, functional CTA doubling as the cover, rather
             than a patch that only exists to hide something. -->
        <a routerLink="/shop" class="hero-order-tag">Order Now →</a>
      </div>
    </section>

    <section class="container welcome">
      <span class="eyebrow">🍂 Sipping Magical Nostalgia 🍂</span>
      <h2>Welcome to Home Cafe by Bami</h2>
      <p class="welcome-copy">
        Where every cup tells a story and every pastry is baked with love. Nestled in our cozy,
        moss-soft woodland cottage, discover a peaceful haven crafted from rustic timber, glowing
        glass lanterns, and the smell of freshly ground fairy beans.
      </p>
      <div class="welcome-actions">
        <a href="#discover" class="btn btn-primary">Explore Our Menu →</a>
        <a href="#philosophy" class="btn btn-secondary">Our Philosophy</a>
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
    .hero { margin-top: 24px; }
    .hero-media {
      position: relative; border-radius: var(--radius-lg); overflow: hidden;
      background: var(--color-text-chocolate);
    }
    .hero-photo {
      width: 100%; height: auto; display: block; aspect-ratio: 16/9; object-fit: cover;
      /* Positive translate shifts the (scaled-up) frame content down/right, which pushes its
         bottom-right corner — where the source video's watermark sits — out past the container's
         clipped edge, revealing more top-left content in exchange. */
      transform: scale(1.05) translate(1.5%, 1.5%); transform-origin: center center;
    }

    .play-btn {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 72px; height: 72px; border-radius: 50%; border: none; cursor: pointer;
      background: rgba(30, 42, 36, 0.55); display: flex; align-items: center; justify-content: center;
      transition: background 0.2s ease;
    }
    .play-btn:hover { background: rgba(30, 42, 36, 0.75); }
    .play-triangle {
      width: 0; height: 0; margin-left: 5px;
      border-top: 14px solid transparent; border-bottom: 14px solid transparent;
      border-left: 22px solid var(--color-canvas-oat);
    }

    .mute-btn {
      position: absolute; top: 16px; right: 16px; width: 40px; height: 40px;
      border-radius: 50%; border: none; cursor: pointer; font-size: 16px;
      background: rgba(30, 42, 36, 0.55); display: flex; align-items: center; justify-content: center;
      transition: background 0.2s ease;
    }
    .mute-btn:hover { background: rgba(30, 42, 36, 0.75); }

    /* Fades to dark along the bottom edge — reads as an intentional cinematic vignette rather than
       a cover-up, and doubles as extra insurance under the corner the crop/zoom above already
       pushes out of frame. Remove if the crop alone turns out to fully clear the watermark. */
    .hero-vignette {
      position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(to top, rgba(30, 42, 36, 0.75) 0%, rgba(30, 42, 36, 0) 20%);
    }

    .hero-overlay {
      position: absolute; left: 0; right: 0; bottom: 0; padding: 16px;
      display: flex; align-items: flex-end; pointer-events: none;
    }
    .hero-info {
      background: rgba(30, 42, 36, 0.75); color: var(--color-canvas-oat);
      padding: 10px 16px; border-radius: var(--radius-sm); pointer-events: auto;
    }
    .hero-address, .hero-hours { margin: 0; font-size: 13px; font-weight: 600; }
    .hero-hours { opacity: 0.85; margin-top: 2px; }
    .hero-order-tag {
      /* Lifted off the exact corner and shifted in to sit over the watermark. Per a screenshot
         check, a small sliver (~15-20px) of a gray triangular mark still peeked out just above
         the button's top edge — bumped up and made taller to close that last gap. */
      position: absolute; right: 20px; bottom: 55px;
      background: var(--color-terracotta); color: var(--color-white); font-weight: 700;
      font-size: 15px; padding: 14px 26px; border-radius: var(--radius-md);
      white-space: nowrap; box-shadow: var(--shadow-elevated);
    }
    .hero-order-tag:hover { background: var(--color-terracotta-dark); }

    .eyebrow { color: var(--color-terracotta); font-weight: 700; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; }

    .welcome { margin: 48px auto; max-width: 720px; text-align: center; }
    .welcome .eyebrow { display: block; margin-bottom: 12px; }
    .welcome h2 { margin: 0 0 16px; }
    .welcome-copy { color: var(--color-text-muted); line-height: 1.6; margin: 0 0 28px; }
    .welcome-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

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
  store = inject(StoreService);
  router = inject(Router);
  activeProduct = signal<Product | null>(null);
  heroPlaying = signal(false);
  /** Starts muted — autoplay only works unprompted if muted, per every browser's autoplay policy. */
  heroMuted = signal(true);

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
