import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-account-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>My Account</h1>

    <div class="card section">
      <h3>Profile</h3>
      <p><strong>Name:</strong> {{ auth.user()?.name }}</p>
      <p><strong>Email:</strong> {{ auth.user()?.email }}</p>
    </div>

    <div class="card section">
      <h3>Change Password</h3>
      <div class="field">
        <label for="current">Current Password</label>
        <input id="current" type="password" [(ngModel)]="currentPassword" name="currentPassword" autocomplete="current-password" />
      </div>
      <div class="field">
        <label for="new">New Password</label>
        <input id="new" type="password" [(ngModel)]="newPassword" name="newPassword" autocomplete="new-password" />
      </div>
      <div class="field">
        <label for="confirm">Confirm New Password</label>
        <input id="confirm" type="password" [(ngModel)]="confirmPassword" name="confirmPassword" autocomplete="new-password" />
      </div>

      @if (errorMessage()) {
        <p class="error">{{ errorMessage() }}</p>
      }

      <button class="btn btn-primary btn-block" [disabled]="submitting()" (click)="submit()">
        {{ submitting() ? 'Updating…' : 'Update Password' }}
      </button>
    </div>
  `,
  styles: [`
    .section { padding: 20px; margin-bottom: 16px; max-width: 480px; }
    .error { color: var(--color-error); font-weight: 600; font-size: 13px; margin-bottom: 12px; }
  `],
})
export class AdminAccountPageComponent {
  auth = inject(AuthService);
  private notifications = inject(NotificationService);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  submitting = signal(false);
  errorMessage = signal('');

  submit() {
    this.errorMessage.set('');

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.errorMessage.set('Please fill in all fields.');
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage.set('New password must be at least 8 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('New password and confirmation do not match.');
      return;
    }

    this.submitting.set(true);
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notifications.success('Password updated.');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err: { error?: { message?: string } }) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message || 'Could not update password. Please try again.');
      },
    });
  }
}
