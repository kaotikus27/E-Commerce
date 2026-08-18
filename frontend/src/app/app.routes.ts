import { Routes } from '@angular/router';
import { checkoutGuard } from './core/guards/checkout.guard';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'orders', pathMatch: 'full' },
      {
        path: 'orders',
        loadComponent: () => import('./features/admin/orders/admin-orders-board.component').then(m => m.AdminOrdersBoardComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./features/admin/products/admin-products-page.component').then(m => m.AdminProductsPageComponent),
      },
      {
        path: 'promotions',
        loadComponent: () => import('./features/admin/promotions/admin-promotions-page.component').then(m => m.AdminPromotionsPageComponent),
      },
      {
        path: 'promo-codes',
        loadComponent: () => import('./features/admin/promo-codes/admin-promo-codes-page.component').then(m => m.AdminPromoCodesPageComponent),
      },
      {
        path: 'messages',
        loadComponent: () => import('./features/admin/messages/admin-messages-page.component').then(m => m.AdminMessagesPageComponent),
      },
      {
        path: 'faqs',
        loadComponent: () => import('./features/admin/faqs/admin-faqs-page.component').then(m => m.AdminFaqsPageComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/admin/settings/admin-store-settings.component').then(m => m.AdminStoreSettingsComponent),
      },
      {
        path: 'history',
        loadComponent: () => import('./features/admin/history/admin-history-page.component').then(m => m.AdminHistoryPageComponent),
      },
      {
        path: 'account',
        loadComponent: () => import('./features/admin/account/admin-account-page.component').then(m => m.AdminAccountPageComponent),
      },
    ],
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/admin-login-page.component').then(m => m.AdminLoginPageComponent),
  },
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
    redirectTo: 'contact',
    pathMatch: 'full',
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
