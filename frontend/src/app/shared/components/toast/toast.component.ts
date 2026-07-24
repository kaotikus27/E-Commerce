import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack">
      @for (t of notifications.toasts(); track t.id) {
        <div class="toast" [class]="'toast-' + t.type" (click)="notifications.dismiss(t.id)">
          {{ t.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 16px;
      right: 16px;
      left: 16px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      background: var(--color-text-chocolate);
      color: var(--color-canvas-oat);
      padding: 12px 18px;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-elevated);
      font-size: 14px;
      font-weight: 600;
      max-width: 320px;
      animation: slideIn .2s ease;
    }
    .toast-success { background: var(--color-sage-dark); }
    .toast-error { background: var(--color-error); }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @media (min-width: 640px) { .toast-stack { left: auto; width: 340px; } }
  `],
})
export class ToastContainerComponent {
  notifications = inject(NotificationService);
}
