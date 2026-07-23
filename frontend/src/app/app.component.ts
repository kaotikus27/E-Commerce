import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
    <app-location-banner></app-location-banner>
    <app-navbar></app-navbar>
    <main>
      <router-outlet></router-outlet>
    </main>
    <app-footer></app-footer>
    <app-cart-drawer></app-cart-drawer>
    <app-toast-container></app-toast-container>
  `,
})
export class AppComponent {}
