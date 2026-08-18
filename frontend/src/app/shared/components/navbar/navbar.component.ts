import { Component, ElementRef, HostListener, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="container nav-row">
        <a routerLink="/" class="logo">
          <img src="assets/logo_bami.jpg" alt="Home Cafe by Bami" />
        </a>

        <button class="menu-toggle" (click)="mobileOpen.set(!mobileOpen())" aria-label="Toggle menu">☰</button>

        <div class="nav-links" [class.mobile-open]="mobileOpen()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="mobileOpen.set(false)">Home</a>
          <a routerLink="/about" routerLinkActive="active" (click)="mobileOpen.set(false)">About Us</a>
          <a routerLink="/shop" routerLinkActive="active" (click)="mobileOpen.set(false)">Product</a>
          <a routerLink="/contact" routerLinkActive="active" (click)="mobileOpen.set(false)">Contact</a>

          <div class="search-box">
            <input
              type="search"
              placeholder="Search croissants, lattes..."
              [(ngModel)]="searchTerm"
              (keyup.enter)="search()"
              name="search"
              aria-label="Search menu" />
            <button class="btn btn-primary btn-sm" (click)="search()">Search</button>
          </div>
        </div>

        <div class="nav-actions">
          <button class="icon-btn cart-btn" (click)="cart.toggleDrawer()" aria-label="Open cart">
            <img src="assets/shopping_cart.png" alt="" class="cart-icon" />
            <span class="count-badge" *ngIf="cart.itemCount() > 0">{{ cart.itemCount() }}</span>
            <span class="fly-badge" *ngIf="showFlyBadge()">+1</span>
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar { background: var(--color-white); box-shadow: var(--shadow-card); }
    .nav-row { display: flex; align-items: center; gap: 12px; min-height: 64px; flex-wrap: wrap; }
    .logo { display: flex; align-items: center; height: 44px; }
    .logo img { height: 100%; width: auto; object-fit: contain; }
    .menu-toggle { display: block; background: none; border: none; font-size: 22px; min-width: 44px; }
    .nav-links { display: none; width: 100%; order: 3; flex-direction: column; gap: 4px; }
    .nav-links.mobile-open { display: flex; }
    .nav-links > a {
      font-weight: 600; font-size: 15px; color: var(--color-text-chocolate); padding: 10px 6px;
      border-bottom: 2px solid transparent;
    }
    .nav-links > a.active { color: var(--color-terracotta); border-bottom-color: var(--color-terracotta); }
    .search-box { display: flex; gap: 8px; padding: 8px 0; }
    .search-box input { flex: 1; min-height: 44px; border-radius: var(--radius-pill); border: 1.5px solid var(--color-border-subtle); padding: 0 16px; font-size: 16px; font-family: var(--font-body); }
    .nav-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
    .icon-btn { position: relative; background: none; border: none; font-size: 20px; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
    .cart-icon { width: 22px; height: 22px; }
    .count-badge {
      position: absolute; top: 2px; right: 2px; background: var(--color-terracotta); color: var(--color-white);
      font-size: 10px; font-weight: 700; border-radius: 50%; width: 16px; height: 16px;
      display: flex; align-items: center; justify-content: center;
    }
    .fly-badge {
      position: absolute; top: 0; right: -4px; color: var(--color-terracotta); font-size: 13px; font-weight: 700;
      pointer-events: none; animation: fly-up-fade 0.9s ease-out forwards;
    }
    @keyframes fly-up-fade {
      0% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-22px); }
    }
    @media (min-width: 900px) {
      .menu-toggle { display: none; }
      .nav-links { display: flex; flex-direction: row; align-items: center; gap: 24px; width: auto; order: 0; flex: 1; margin-left: 32px; }
      .search-box { padding: 0; width: 220px; }
    }
  `],
})
export class NavbarComponent {
  cart = inject(CartService);
  router = inject(Router);
  private elementRef = inject(ElementRef);

  mobileOpen = signal(false);
  searchTerm = '';
  showFlyBadge = signal(false);
  private flyBadgeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      if (this.cart.addedPulse() === 0) return; // skip the initial value, before any item was ever added
      // All signal writes deferred via setTimeout — effects aren't allowed to write signals
      // synchronously (NG0600), so this whole reset-then-show sequence runs outside the effect.
      setTimeout(() => {
        clearTimeout(this.flyBadgeTimer);
        this.showFlyBadge.set(false);
        // Re-triggers the CSS animation even on back-to-back adds, by forcing a DOM remove/re-add first.
        setTimeout(() => {
          this.showFlyBadge.set(true);
          this.flyBadgeTimer = setTimeout(() => this.showFlyBadge.set(false), 900);
        });
      });
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.mobileOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.mobileOpen.set(false);
    }
  }

  search() {
    this.mobileOpen.set(false);
    this.router.navigate(['/shop'], { queryParams: { q: this.searchTerm } });
  }
}
