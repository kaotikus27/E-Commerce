import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protects /admin: only sessions authenticated as an ADMIN user get through. */
export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.user()?.role === 'ADMIN') return true;

  router.navigate(['/admin/login'], { queryParams: { redirectTo: state.url } });
  return false;
};
