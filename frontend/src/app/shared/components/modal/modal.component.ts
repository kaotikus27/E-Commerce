import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="modal-backdrop" [class]="backdropClass" (click)="close.emit()">
        <div class="modal-panel" [class]="panelClass" (click)="$event.stopPropagation()">
          <ng-content select="[modalDecoration]"></ng-content>
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
      position: fixed; inset: 0; background: var(--color-backdrop);
      display: flex; align-items: flex-end; justify-content: center;
      z-index: 900; animation: fadeIn .15s ease;
    }
    .modal-panel {
      background: var(--color-white); width: 100%; max-width: 520px;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      max-height: 90vh; overflow: visible; position: relative; z-index: 0;
      display: flex; flex-direction: column;
      animation: slideUp .2s ease;
    }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 12px; flex-shrink: 0; }
    .modal-body {
      padding: 0 20px 20px; overflow-y: auto; flex: 1; min-height: 0;
      /* Scroll stays fully functional (mouse wheel, touch, keyboard) — only the visible
         scrollbar track/thumb is hidden. */
      scrollbar-width: none; -ms-overflow-style: none;
    }
    .modal-body::-webkit-scrollbar { display: none; }
    .modal-close { background: none; border: none; font-size: 18px; min-height: 44px; min-width: 44px; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @media (min-width: 640px) {
      .modal-backdrop { align-items: center; }
      .modal-panel { border-radius: var(--radius-lg); }
    }

    /* Themed card look (currently used by item-modal) — warm parchment card with a wood-board
       frame, instead of the default plain white panel. Opt-in via [panelClass], so it doesn't
       affect admin/other modals using the same shared component. Border color/thickness/shadow
       sampled directly from assets/wood-board-outer.png (#8B5E3C border, ~6px at this panel's
       scale) rather than eyeballed, per Leo's reference. */
    .modal-panel.themed-card {
      background: #F7F3E9; border: 6px solid #8B5E3C;
      border-radius: var(--radius-lg);
      box-shadow: 0 10px 28px rgba(43, 26, 15, 0.28);
    }
    .modal-panel.themed-card .modal-header h3 { color: #2E4A3B; }
    .modal-panel.themed-card .modal-close { color: #2E4A3B; }

    .modal-backdrop.themed-backdrop { background: rgb(197 197 197 / 51%); }
  `],
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  /** Optional extra class on .modal-panel so a specific caller (e.g. the item-modal's
   *  themed card look) can override the default plain-white panel without affecting
   *  every other modal in the app. */
  @Input() panelClass = '';
  /** Optional extra class on .modal-backdrop, same opt-in pattern as [panelClass]. */
  @Input() backdropClass = '';
  @Output() close = new EventEmitter<void>();
}
