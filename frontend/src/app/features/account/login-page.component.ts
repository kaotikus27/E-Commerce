import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="container login-page">
      <div class="card form-card">
        <h1>{{ mode() === 'login' ? 'Log In' : 'Create Account' }}</h1>

        @if (mode() === 'register') {
          <div class="field">
            <label for="name">Name</label>
            <input id="name" [(ngModel)]="name" name="name" />
          </div>
        }
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" [(ngModel)]="email" name="email" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" [(ngModel)]="password" name="password" />
        </div>

        <button class="btn btn-primary btn-block" (click)="submit()">
          {{ mode() === 'login' ? 'Log In' : 'Sign Up' }}
        </button>

        <p class="switch">
          @if (mode() === 'login') {
            Don't have an account? <a (click)="mode.set('register')">Sign up</a>
          } @else {
            Already have an account? <a (click)="mode.set('login')">Log in</a>
          }
        </p>

        <p class="switch"><a routerLink="/shop">Continue as guest →</a></p>
      </div>
    </section>
  `,
  styles: [`
    .login-page { padding: 40px 16px; max-width: 420px; }
    .form-card { padding: 24px; }
    .switch { text-align: center; font-size: 14px; margin-top: 8px; }
    .switch a { color: var(--color-sage-700); font-weight: 700; cursor: pointer; text-decoration: underline; }
  `],
})
export class LoginPageComponent {
  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  mode = signal<'login' | 'register'>('login');
  name = '';
  email = '';
  password = '';

  submit() {
    const action$ = this.mode() === 'login'
      ? this.auth.login(this.email, this.password)
      : this.auth.register(this.name, this.email, this.password);

    action$.subscribe(() => {
      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') ?? '/account';
      this.router.navigateByUrl(redirectTo);
    });
  }
}
