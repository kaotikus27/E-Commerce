import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

/** Drives toast alerts for user actions (e.g. "Item added to cart"). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  private push(message: string, type: Toast['type']) {
    const toast: Toast = { id: this.nextId++, message, type };
    this.toasts.set([...this.toasts(), toast]);
    setTimeout(() => this.dismiss(toast.id), 3000);
  }

  success(message: string) { this.push(message, 'success'); }
  error(message: string) { this.push(message, 'error'); }
  info(message: string) { this.push(message, 'info'); }

  dismiss(id: number) {
    this.toasts.set(this.toasts().filter(t => t.id !== id));
  }
}
