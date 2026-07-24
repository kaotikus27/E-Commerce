import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ToastContainerComponent } from './shared/components/toast/toast.component';
import { LocationBannerComponent } from './features/store/location-banner.component';
import { CartDrawerComponent } from './features/cart/cart-drawer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastContainerComponent, LocationBannerComponent, CartDrawerComponent],
  template: `
    @if (!isAdminRoute()) {
      <app-location-banner></app-location-banner>
      <app-navbar></app-navbar>
    }
    <main>
      <router-outlet></router-outlet>
    </main>
    @if (!isAdminRoute()) {
      <app-footer></app-footer>
      <app-cart-drawer></app-cart-drawer>
    }
    <app-toast-container></app-toast-container>
  `,
})
export class AppComponent {
  private router = inject(Router);

  /** The Admin Dashboard renders its own shell (admin-shell.component.ts) — no storefront chrome around it. */
  isAdminRoute = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects.startsWith('/admin'))
    ),
    { initialValue: this.router.url.startsWith('/admin') }
  );
}
