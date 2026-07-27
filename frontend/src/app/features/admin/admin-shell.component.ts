import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/** Layout shell for /admin — deliberately has no storefront navbar/footer/cart-drawer. */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-shell">
      <header class="admin-topbar">
        <span class="brand">Home by Bami — Admin</span>
        <nav class="tabs">
          <a routerLink="/admin/orders" routerLinkActive="active">Live Orders</a>
          <a routerLink="/admin/products" routerLinkActive="active">Menu &amp; Inventory</a>
          <a routerLink="/admin/promotions" routerLinkActive="active">Promotions</a>
          <a routerLink="/admin/faqs" routerLinkActive="active">FAQs</a>
          <a routerLink="/admin/settings" routerLinkActive="active">Store Settings</a>
          <a routerLink="/admin/history" routerLinkActive="active">History</a>
        </nav>
        <div class="account">
          <a routerLink="/admin/account" routerLinkActive="active" class="who" title="Account settings">⚙ {{ auth.user()?.name }}</a>
          <button class="btn btn-secondary btn-sm" (click)="logout()">Log Out</button>
        </div>
      </header>
      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--color-canvas-oat); }
    .admin-topbar {
      display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
      padding: 12px 20px; background: var(--color-white); box-shadow: var(--shadow-card);
      position: sticky; top: 0; z-index: 100;
    }
    .brand { font-family: var(--font-heading); font-weight: 700; color: var(--color-text-chocolate); }
    .tabs { display: flex; gap: 16px; margin-right: auto; }
    .tabs a { font-weight: 600; color: var(--color-text-muted); padding: 6px 4px; border-bottom: 2px solid transparent; }
    .tabs a.active { color: var(--color-text-chocolate); border-bottom-color: var(--color-hero-sage); }
    .account { display: flex; align-items: center; gap: 12px; }
    .who { font-size: 14px; font-weight: 600; color: var(--color-text-chocolate); padding: 6px 8px; border-radius: var(--radius-sm); }
    .who.active, .who:hover { background: var(--color-subdued-pistachio); }
    .admin-content { flex: 1; padding: 20px; max-width: 1280px; width: 100%; margin: 0 auto; }
  `],
})
export class AdminShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
