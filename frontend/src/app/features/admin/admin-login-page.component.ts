import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/** Dedicated staff sign-in — separate from the customer /login page (no sign-up, no guest link). */
@Component({
  selector: 'app-admin-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="container admin-login-page">
      <div class="card form-card">
        <h1>Admin Sign In</h1>
        <p class="subtitle">Home by Bami — staff access only</p>

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
      </div>
    </section>
  `,
  styles: [`
    .admin-login-page { padding: 40px 16px; max-width: 420px; }
    .form-card { padding: 24px; }
    .subtitle { font-size: 13px; color: var(--color-text-muted); margin: -8px 0 16px; }
    .error { color: var(--color-error); font-weight: 600; font-size: 13px; margin-bottom: 12px; }
  `],
})
export class AdminLoginPageComponent {
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
        if (this.auth.user()?.role !== 'ADMIN') {
          this.errorMessage.set('This account does not have admin access.');
          this.auth.logout();
          return;
        }
        const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') ?? '/admin';
        this.router.navigateByUrl(redirectTo);
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(err?.error?.message || 'Could not sign in — the server may be unreachable.');
      },
    });
  }
}
