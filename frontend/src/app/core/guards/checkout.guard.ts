import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CartService } from '../services/cart.service';
import { StoreService } from '../services/store.service';
import { NotificationService } from '../services/notification.service';

/** Protects /checkout: an empty cart or a closed store redirects back to the menu. */
export const checkoutGuard: CanActivateFn = async () => {
  const cart = inject(CartService);
  const store = inject(StoreService);
  const notifications = inject(NotificationService);
  const router = inject(Router);

  // Wait for the first store-info fetch before reading isOpen() — it defaults to `false`
  // until that resolves, which would otherwise misread a fresh page load as "closed".
  await store.ensureLoaded();

  if (cart.isEmpty()) {
    router.navigate(['/shop']);
    return false;
  }

  if (!store.isOpen()) {
    notifications.error("We're closed right now — please check back during our hours.");
    router.navigate(['/shop']);
    return false;
  }

  return true;
};
