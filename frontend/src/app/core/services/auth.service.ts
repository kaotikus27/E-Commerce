import { Injectable, computed, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthResponse, User } from '../models/user.model';

const TOKEN_KEY = 'bakery_jwt';
const USER_KEY = 'bakery_user';

/** User login, registration, JWT storage, and session handling. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(this.readUser());
  readonly isAuthenticated = computed(() => !!this.user());

  constructor(private api: ApiService) {}

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private readUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  login(email: string, password: string) {
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap(res => this.setSession(res))
    );
  }

  register(name: string, email: string, password: string) {
    return this.api.post<AuthResponse>('/auth/register', { name, email, password }).pipe(
      tap(res => this.setSession(res))
    );
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.user.set(res.user);
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  /** No demo fallback here (unlike login/register) — a password-change failure must be real and visible. */
  changePassword(currentPassword: string, newPassword: string) {
    return this.api.put<void>('/admin/password', { currentPassword, newPassword });
  }
}
