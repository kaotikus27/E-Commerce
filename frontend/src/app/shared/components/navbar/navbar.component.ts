import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <nav class="navbar">
      <div class="container nav-row">
        <a routerLink="/" class="logo">🥐 Sage & Cream</a>

        <button class="menu-toggle" (click)="mobileOpen.set(!mobileOpen())" aria-label="Toggle menu">☰</button>

        <div class="nav-search" [class.mobile-open]="mobileOpen()">
          <div class="categories">
            @for (c of productService.categories(); track c.id) {
              <a routerLink="/shop" [queryParams]="{ category: c.id }" class="cat-link">{{ c.icon }} {{ c.name }}</a>
            }
          </div>
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
          <a routerLink="/account" class="icon-btn" aria-label="Wishlist">
            ♡<span class="count-badge" *ngIf="wishlistCount() > 0">{{ wishlistCount() }}</span>
          </a>
          <button class="icon-btn cart-btn" (click)="cart.toggleDrawer()" aria-label="Open cart">
            🛒<span class="count-badge" *ngIf="cart.itemCount() > 0">{{ cart.itemCount() }}</span>
          </button>
          @if (auth.isAuthenticated()) {
            <a routerLink="/account" class="icon-btn" aria-label="Account">👤</a>
          } @else {
            <a routerLink="/login" class="btn btn-secondary btn-sm">Log In</a>
          }
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar { background: var(--color-white); box-shadow: var(--shadow-card); position: sticky; top: 0; z-index: 500; }
    .nav-row { display: flex; align-items: center; gap: 12px; min-height: 64px; flex-wrap: wrap; }
    .logo { font-size: 20px; font-weight: 800; color: var(--color-espresso); }
    .menu-toggle { display: block; background: none; border: none; font-size: 22px; min-width: 44px; }
    .nav-search { display: none; width: 100%; order: 3; }
    .nav-search.mobile-open { display: block; }
    .categories { display: flex; gap: 12px; overflow-x: auto; padding: 8px 0; }
    .cat-link { white-space: nowrap; font-size: 14px; font-weight: 600; color: var(--color-charcoal); padding: 6px 10px; border-radius: 999px; background: var(--color-pistachio); }
    .search-box { display: flex; gap: 8px; padding-bottom: 8px; }
    .search-box input { flex: 1; min-height: 44px; border-radius: var(--radius-sm); border: 1.5px solid #DDD6CC; padding: 0 12px; }
    .nav-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
    .icon-btn { position: relative; background: none; border: none; font-size: 20px; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
    .count-badge {
      position: absolute; top: 2px; right: 2px; background: var(--color-sage); color: white;
      font-size: 10px; font-weight: 700; border-radius: 50%; width: 16px; height: 16px;
      display: flex; align-items: center; justify-content: center;
    }
    @media (min-width: 900px) {
      .menu-toggle { display: none; }
      .nav-search { display: flex; align-items: center; gap: 16px; width: auto; order: 0; flex: 1; }
      .categories { padding: 0; }
      .search-box { padding: 0; }
    }
  `],
})
export class NavbarComponent {
  cart = inject(CartService);
  auth = inject(AuthService);
  productService = inject(ProductService);
  router = inject(Router);

  mobileOpen = signal(false);
  searchTerm = '';
  wishlistCount = signal(0);

  search() {
    this.router.navigate(['/shop'], { queryParams: { q: this.searchTerm } });
  }
}
