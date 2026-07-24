import { Component, EventEmitter, Output, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../core/services/store.service';
import { nextOpenLabel } from '../../core/utils/next-open.util';

@Component({
  selector: 'app-pickup-time-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="picker">
      <span class="picker-label">Pickup Time</span>
      @if (slots().length) {
        <div class="slots">
          @for (slot of slots(); track slot) {
            <button
              class="slot"
              [class.active]="selected() === slot"
              (click)="select(slot)">
              {{ slot }}
            </button>
          }
        </div>
      } @else {
        <p class="closed-notice">
          We're closed right now{{ nextOpen() ? ' — pickup opens ' + nextOpen() : '' }}. Please come back during our hours.
        </p>
      }
    </div>
  `,
  styles: [`
    .picker { margin-bottom: 16px; }
    .picker-label { font-size: 13px; font-weight: 700; color: var(--color-text-chocolate); display: block; margin-bottom: 8px; }
    .slots { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .slot {
      white-space: nowrap; background: var(--color-white); border: 1.5px solid var(--color-subdued-pistachio);
      border-radius: var(--radius-pill); padding: 0 16px; min-height: 44px; font-weight: 600; font-size: 13px;
    }
    .slot.active { background: var(--color-hero-sage); border-color: var(--color-hero-sage); color: var(--color-white); }
    .closed-notice { font-size: 13px; color: var(--color-status-closed); font-weight: 600; }
  `],
})
export class PickupTimePickerComponent {
  store = inject(StoreService);

  @Output() timeSelected = new EventEmitter<string>();

  /**
   * Reactive, not a one-time read at construction — StoreService's hours/isOpen load
   * asynchronously, and a fresh page load can easily construct this component before that
   * first fetch resolves. A plain field frozen at construction time would permanently lock
   * in "no slots" for that session; recomputing off the live signals self-corrects instead.
   */
  slots = computed(() => (this.store.isOpen() ? this.generateSlots() : []));
  nextOpen = computed(() => nextOpenLabel(this.store.schedule()));

  private manualSelection = signal<string | null>(null);
  selected = computed(() => this.manualSelection() ?? this.slots()[0] ?? '');

  constructor() {
    effect(() => this.timeSelected.emit(this.selected()));
  }

  select(slot: string) {
    this.manualSelection.set(slot);
  }

  /** Generates near-term slots, never past the store's midnight closing time. */
  private generateSlots(): string[] {
    const slots: string[] = [];
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = Math.ceil(nowMinutes / 15) * 15 + this.store.leadTimeMinutes();

    for (let i = 0; i < 6; i++) {
      const totalMinutes = start + i * 15;
      if (totalMinutes >= 24 * 60) break;
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      slots.push(`${displayHour}:${m.toString().padStart(2, '0')} ${period}`);
    }
    return slots;
  }
}
