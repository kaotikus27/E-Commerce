import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';

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
          <button class="icon-btn" (click)="goToAccount()" aria-label="Account">👤</button>
          <button class="icon-btn cart-btn" (click)="cart.toggleDrawer()" aria-label="Open cart">
            🛍️<span class="count-badge" *ngIf="cart.itemCount() > 0">{{ cart.itemCount() }}</span>
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar { background: var(--color-white); box-shadow: var(--shadow-card); position: sticky; top: 0; z-index: 500; }
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
    .count-badge {
      position: absolute; top: 2px; right: 2px; background: var(--color-terracotta); color: var(--color-white);
      font-size: 10px; font-weight: 700; border-radius: 50%; width: 16px; height: 16px;
      display: flex; align-items: center; justify-content: center;
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
  auth = inject(AuthService);
  router = inject(Router);

  mobileOpen = signal(false);
  searchTerm = '';

  search() {
    this.mobileOpen.set(false);
    this.router.navigate(['/shop'], { queryParams: { q: this.searchTerm } });
  }

  goToAccount() {
    this.router.navigate([this.auth.isAuthenticated() ? '/account' : '/login']);
  }
}
