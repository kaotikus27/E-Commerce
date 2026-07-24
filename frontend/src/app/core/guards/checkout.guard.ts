import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CartService } from '../services/cart.service';
import { StoreService } from '../services/store.service';
import { NotificationService } from '../services/notification.service';

/** Protects /checkout: an empty cart or a closed store redirects back to the menu. */
export const checkoutGuard: CanActivateFn = () => {
  const cart = inject(CartService);
  const store = inject(StoreService);
  const notifications = inject(NotificationService);
  const router = inject(Router);

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
