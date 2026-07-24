import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Customer login only — self-registration is temporarily hidden here (not removed from the
 * backend, just no UI entry point) since guest checkout is the primary ordering flow and
 * doesn't require an account at all. Admin sign-in lives at its own /admin/login route.
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="container login-page">
      <div class="card form-card">
        <h1>Log In</h1>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" [(ngModel)]="email" name="email" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" [(ngModel)]="password" name="password" />
        </div>

        @if (errorMessage()) {
          <p class="error">{{ errorMessage() }}</p>
        }

        <button class="btn btn-primary btn-block" (click)="submit()">Log In</button>

        <p class="switch"><a routerLink="/shop">Continue as guest →</a></p>
      </div>
    </section>
  `,
  styles: [`
    .login-page { padding: 40px 16px; max-width: 420px; }
    .form-card { padding: 24px; }
    .switch { text-align: center; font-size: 14px; margin-top: 8px; }
    .switch a { color: var(--color-sage-700); font-weight: 700; cursor: pointer; text-decoration: underline; }
    .error { color: var(--color-error); font-weight: 600; font-size: 13px; margin-bottom: 12px; }
  `],
})
export class LoginPageComponent {
  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  email = '';
  password = '';
  errorMessage = signal('');

  submit() {
    this.errorMessage.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') ?? '/account';
        this.router.navigateByUrl(redirectTo);
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(err?.error?.message || 'Could not sign in — the server may be unreachable.');
      },
    });
  }
}
