import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="close.emit()">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button class="modal-close" (click)="close.emit()" aria-label="Close">✕</button>
          </div>
          <div class="modal-body">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(43,43,43,0.5);
      display: flex; align-items: flex-end; justify-content: center;
      z-index: 900; animation: fadeIn .15s ease;
    }
    .modal-panel {
      background: var(--color-white); width: 100%; max-width: 520px;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      max-height: 90vh; overflow-y: auto; padding: 20px;
      animation: slideUp .2s ease;
    }
    .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .modal-close { background: none; border: none; font-size: 18px; min-height: 44px; min-width: 44px; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @media (min-width: 640px) {
      .modal-backdrop { align-items: center; }
      .modal-panel { border-radius: var(--radius-lg); }
    }
  `],
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Output() close = new EventEmitter<void>();
}
