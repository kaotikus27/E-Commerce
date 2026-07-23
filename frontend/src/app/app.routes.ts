import { Routes } from '@angular/router';
import { checkoutGuard } from './core/guards/checkout.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-page.component').then(m => m.HomePageComponent),
  },
  {
    path: 'shop',
    loadComponent: () => import('./features/catalog/pages/menu-page/menu-page.component').then(m => m.MenuPageComponent),
  },
  {
    path: 'checkout',
    canActivate: [checkoutGuard],
    loadComponent: () => import('./features/checkout/checkout-page/checkout-page.component').then(m => m.CheckoutPageComponent),
  },
  {
    path: 'order-confirmation/:id',
    loadComponent: () => import('./features/checkout/order-confirmation/order-confirmation.component').then(m => m.OrderConfirmationComponent),
  },
  {
    path: 'order-status/:id',
    loadComponent: () => import('./features/order-status/order-status-page.component').then(m => m.OrderStatusPageComponent),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account-page.component').then(m => m.AccountPageComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/account/login-page.component').then(m => m.LoginPageComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/static/about-page.component').then(m => m.AboutPageComponent),
  },
  {
    path: 'faq',
    loadComponent: () => import('./features/static/faq-page.component').then(m => m.FaqPageComponent),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/static/contact-page.component').then(m => m.ContactPageComponent),
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/static/terms-page.component').then(m => m.TermsPageComponent),
  },
  { path: '**', redirectTo: '' },
];
