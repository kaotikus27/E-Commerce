import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pickup-time-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="picker">
      <span class="picker-label">Pickup Time</span>
      <div class="slots">
        @for (slot of slots; track slot) {
          <button
            class="slot"
            [class.active]="selected === slot"
            (click)="select(slot)">
            {{ slot }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .picker { margin-bottom: 16px; }
    .picker-label { font-size: 13px; font-weight: 700; color: var(--color-espresso); display: block; margin-bottom: 8px; }
    .slots { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .slot {
      white-space: nowrap; background: var(--color-white); border: 1.5px solid var(--color-pistachio);
      border-radius: var(--radius-sm); padding: 0 14px; min-height: 44px; font-weight: 600; font-size: 13px;
    }
    .slot.active { background: var(--color-sage); border-color: var(--color-sage); color: white; }
  `],
})
export class PickupTimePickerComponent {
  @Output() timeSelected = new EventEmitter<string>();

  slots = this.generateSlots();
  selected = this.slots[0];

  constructor() {
    this.timeSelected.emit(this.selected);
  }

  select(slot: string) {
    this.selected = slot;
    this.timeSelected.emit(slot);
  }

  private generateSlots(): string[] {
    const slots: string[] = [];
    const now = new Date();
    let minutes = Math.ceil(now.getMinutes() / 15) * 15 + 20;
    let hour = now.getHours();
    if (minutes >= 60) { minutes -= 60; hour += 1; }
    for (let i = 0; i < 6; i++) {
      const h = (hour + Math.floor((minutes + i * 15) / 60)) % 24;
      const m = (minutes + i * 15) % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      slots.push(`${displayHour}:${m.toString().padStart(2, '0')} ${period}`);
    }
    return slots;
  }
}
