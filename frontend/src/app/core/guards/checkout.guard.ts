import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CartService } from '../services/cart.service';

/** Protects /checkout: an empty cart gets redirected back to the menu. */
export const checkoutGuard: CanActivateFn = () => {
  const cart = inject(CartService);
  const router = inject(Router);

  if (!cart.isEmpty()) return true;

  router.navigate(['/shop']);
  return false;
};
