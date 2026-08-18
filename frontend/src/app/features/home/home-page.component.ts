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

    <section class="container philosophy" id="philosophy">
      <span class="eyebrow philosophy-eyebrow">🌿 Our Philosophy 🌿</span>
      <div class="philosophy-grid">
        <!-- Temporary stock photo standing in until a real photo/illustration is provided. -->
        <img
          class="philosophy-image"
          src="https://images.unsplash.com/photo-1554643897-cadcefdd6bfe?w=800"
          alt="Baker tending a wood-fired hearth oven"
        />
        <div class="philosophy-copy">
          <h2>Crafted by Hand, Blessed by the Forest</h2>
          <p>
            Nestled deep inside the Whispering Pines, Bami's Home Cafe was born from a simple
            dream: to create a resting place for weary wanderers and local spirits alike. We
            believe that true magic resides in simple, slowly crafted details.
          </p>
          <p>
            Every bean is freshly ground by hand on vintage brass mills, and every golden, buttery
            pastry is pulled warm from our stone hearth oven as the forest wakes up. Come warm
            your hands by our fireplace, listen to the crackle of firewood, and let the outside
            world fade away.
          </p>
          <div class="philosophy-stats">
            <div class="stat"><strong>100%</strong><span>Organic Flour</span></div>
            <div class="stat"><strong>Slow</strong><span>Stone Ground Brew</span></div>
            <div class="stat"><strong>Fresh</strong><span>Baked Hourly</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="container featured" id="discover">
      <div class="featured-header">
        <span class="eyebrow">Fresh From The Hearth</span>
        <h2>What's Brewing Today</h2>
      </div>
      <div class="grid-responsive">
        @for (p of featured(); track p.id) {
          <app-product-card [product]="p" (open)="activeProduct.set($event)" (quickAddToCart)="quickAdd($event)"></app-product-card>
        }
      </div>
      <div class="featured-footer">
        <a routerLink="/shop" class="btn btn-primary">Explore Full Menu →</a>
      </div>
    </section>

    @if (promotionService.promotions().length) {
      <span class="eyebrow promo-eyebrow">🍂 A Touch of Magic 🍂</span>
    }
    @for (promo of promotionService.promotions(); track promo.id) {
      <section class="container">
        <div class="promo">
          <span class="promo-tag">🎁 Limited Time Offer</span>
          <h2 class="promo-title">{{ promo.title }}</h2>
          @if (promo.description) {
            <p>{{ promo.description }}</p>
          }
          @if (promo.buttonLabel && promo.buttonLink) {
            <a [href]="promo.buttonLink" (click)="goTo($event, promo.buttonLink!)" class="btn promo-btn">{{ promo.buttonLabel }}</a>
          }
        </div>
      </section>
    }

    <section class="container testimonials">
      <span class="eyebrow testimonials-eyebrow">Heartfelt Whispers</span>
      <h2>What Our Guests Say</h2>
      <div class="quote-grid">
        <blockquote class="card">
          <span class="quote-mark" aria-hidden="true">"</span>
          <p>Best croissants in the neighborhood — ordering ahead means I never miss picking mine up fresh.</p>
          <cite>Priya M.<span class="quote-role">Neighborhood Regular</span></cite>
        </blockquote>
        <blockquote class="card">
          <span class="quote-mark" aria-hidden="true">"</span>
          <p>The order tracker makes it so easy to time my walk over perfectly.</p>
          <cite>Daniel R.<span class="quote-role">Weekday Regular</span></cite>
        </blockquote>
        <blockquote class="card">
          <span class="quote-mark" aria-hidden="true">"</span>
          <p>Their sourdough loaves sell out fast — glad I can reserve mine online now.</p>
          <cite>Ana L.<span class="quote-role">Sourdough Subscriber</span></cite>
        </blockquote>
      </div>
    </section>

    <section class="container faq-section">
      <h2>Frequently Asked Questions</h2>
      <app-faq-accordion [faqs]="faqService.faqs()"></app-faq-accordion>
    </section>

    <section class="container visit">
      <span class="eyebrow visit-eyebrow">Find Your Way</span>
      <h2>Visit Our Haven</h2>
      <div class="visit-grid">
        <div class="visit-row">
          <span class="visit-icon">📍</span>
          <div>
            <strong>Our Cottage</strong>
            <p>{{ store.address() }}</p>
          </div>
        </div>
        <div class="visit-row">
          <span class="visit-icon">🕐</span>
          <div>
            <strong>Gathering Hours</strong>
            <p>{{ store.isOpen() ? 'Open Now' : 'Closed Now' }} · Today {{ store.todayHoursLabel() }}</p>
          </div>
        </div>
        <div class="visit-row">
          <span class="visit-icon">✉️</span>
          <div>
            <strong>Spirited Inquiry</strong>
            <p>hello&#64;homebybami.example{{ store.phone() ? ' · ' + store.phone() : '' }}</p>
          </div>
        </div>
      </div>
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
      display: none;
      position: absolute; left: 0; right: 0; bottom: 0; padding: 16px;
      align-items: flex-end; pointer-events: none;
    }
    @media (min-width: 640px) {
      .hero-overlay { display: flex; }
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
      display: none;
      position: absolute; right: 20px; bottom: 55px;
      background: var(--color-terracotta); color: var(--color-white); font-weight: 700;
      font-size: 15px; padding: 14px 26px; border-radius: var(--radius-md);
      white-space: nowrap; box-shadow: var(--shadow-elevated);
    }
    .hero-order-tag:hover { background: var(--color-terracotta-dark); }
    @media (min-width: 640px) {
      .hero-order-tag { display: block; }
    }

    .eyebrow { color: var(--color-terracotta); font-weight: 700; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; }

    .welcome { margin: 48px auto; text-align: center; }
    .welcome .eyebrow { display: block; margin-bottom: 12px; }
    .welcome h2 { margin: 0 0 16px; }
    .welcome-copy { color: var(--color-text-muted); line-height: 1.6; margin: 0 0 28px; }
    .welcome-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

    .philosophy { margin: 56px auto; }
    .philosophy-eyebrow { display: block; text-align: center; margin-bottom: 24px; }
    .philosophy-grid { display: grid; gap: 32px; align-items: center; }
    .philosophy-image {
      width: 100%; aspect-ratio: 4/3; object-fit: cover;
      background: var(--color-subdued-pistachio); border-radius: var(--radius-lg); display: block;
    }
    .philosophy-copy h2 { margin: 0 0 16px; }
    .philosophy-copy p { color: var(--color-text-muted); line-height: 1.6; margin: 0 0 16px; }
    .philosophy-stats { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 24px; }
    .stat { display: flex; flex-direction: column; gap: 4px; }
    .stat strong { font-size: 20px; color: var(--color-text-chocolate); }
    .stat span { font-size: 12px; color: var(--color-terracotta); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    @media (min-width: 860px) {
      .philosophy-grid { grid-template-columns: 1fr 1.2fr; }
    }

    .featured { margin: 48px auto 40px; }
    .featured-header { margin-bottom: 20px; }
    .featured-header .eyebrow { color: var(--color-terracotta); }
    .featured-footer { display: flex; justify-content: center; margin-top: 28px; }

    .promo-eyebrow { display: block; text-align: center; margin: 56px auto 20px; }
    .promo {
      margin: 0 auto 56px; padding: 48px 40px; border-radius: var(--radius-lg);
      background: var(--color-sage-dark); color: var(--color-canvas-oat); text-align: center;
      box-shadow: var(--shadow-elevated);
    }
    .promo-tag {
      display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--color-canvas-oat); background: rgba(240, 228, 200, 0.14); border-radius: var(--radius-pill);
      padding: 6px 16px; margin-bottom: 16px;
    }
    .promo-title { color: var(--color-canvas-oat); margin: 0 0 12px; }
    .promo p { margin: 0 auto 24px; max-width: 560px; line-height: 1.6; opacity: 0.9; }
    .promo-btn { background: var(--color-canvas-oat); color: var(--color-text-chocolate); }
    .promo-btn:hover { background: var(--color-white); }

    .testimonials { margin: 56px auto; text-align: center; }
    .testimonials-eyebrow { display: block; margin-bottom: 8px; }
    .testimonials h2 { margin: 0 0 32px; }
    .quote-grid { display: grid; gap: 16px; grid-template-columns: 1fr; text-align: left; }
    @media (min-width: 720px) { .quote-grid { grid-template-columns: repeat(3, 1fr); } }
    blockquote { padding: 28px 24px 24px; margin: 0; display: flex; flex-direction: column; }
    .quote-mark { font-size: 40px; line-height: 1; font-family: Georgia, serif; color: var(--color-terracotta); opacity: 0.5; margin-bottom: 4px; }
    blockquote p { font-style: italic; margin: 0 0 16px; color: var(--color-text-chocolate); line-height: 1.5; }
    cite { display: block; font-style: normal; font-weight: 700; color: var(--color-terracotta); font-size: 13px; }
    .quote-role { display: block; margin-top: 2px; font-weight: 600; color: var(--color-text-muted); font-size: 12px; text-transform: none; }

    .faq-section { margin: 0 auto 56px; }

    .visit { margin: 0 auto 56px; text-align: center; }
    .visit-eyebrow { display: block; margin-bottom: 8px; }
    .visit h2 { margin: 0 0 32px; }
    .visit-grid { display: grid; gap: 20px; text-align: left; }
    .visit-row { display: flex; gap: 14px; align-items: flex-start; }
    .visit-icon { font-size: 20px; line-height: 1.4; }
    .visit-row strong { display: block; font-size: 14px; }
    .visit-row p { margin: 2px 0 0; color: var(--color-text-muted); font-size: 14px; }
    @media (min-width: 640px) {
      .visit-grid { grid-template-columns: repeat(3, 1fr); }
    }

    @media (min-width: 960px) {
      .featured .grid-responsive { grid-template-columns: repeat(4, 1fr); }
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
    return this.productService.products().slice(0, 4);
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

  onAdded(e: { product: Product; quantity: number; options: SelectedOption[]; giftWrap: boolean }) {
    this.cart.addItem(e.product, e.quantity, e.options, e.giftWrap);
  }
}
