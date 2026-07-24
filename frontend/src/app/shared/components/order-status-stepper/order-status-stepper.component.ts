import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderStatus } from '../../../core/models/order.model';

interface Step { key: OrderStatus; label: string; icon: string; }

@Component({
  selector: 'app-order-status-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stepper">
      @for (step of steps; track step.key; let i = $index) {
        <div class="step" [class.active]="i <= currentIndex" [class.current]="i === currentIndex">
          <div class="dot">{{ step.icon }}</div>
          <span class="label">{{ step.label }}</span>
          @if (i < steps.length - 1) { <div class="line" [class.filled]="i < currentIndex"></div> }
        </div>
      }
    </div>
  `,
  styles: [`
    .stepper { display: flex; align-items: flex-start; }
    .step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
    .dot {
      width: 40px; height: 40px; border-radius: 50%; background: var(--color-subdued-pistachio);
      display: flex; align-items: center; justify-content: center; font-size: 16px;
      border: 2px solid var(--color-subdued-pistachio); transition: all .2s ease; z-index: 1;
    }
    .step.active .dot { background: var(--color-hero-sage); border-color: var(--color-hero-sage); }
    .step.current .dot { box-shadow: 0 0 0 6px var(--color-subdued-pistachio); }
    .label { font-size: 12px; margin-top: 6px; text-align: center; color: var(--color-text-chocolate); font-weight: 600; }
    .step.active .label { color: var(--color-text-chocolate); }
    .line { position: absolute; top: 20px; left: 50%; width: 100%; height: 3px; background: var(--color-subdued-pistachio); z-index: 0; }
    .line.filled { background: var(--color-hero-sage); }
  `],
})
export class OrderStatusStepperComponent {
  @Input() status: OrderStatus = 'RECEIVED';

  steps: Step[] = [
    { key: 'RECEIVED', label: 'Order Received', icon: '📝' },
    { key: 'PREPARING', label: 'Preparing', icon: '🔥' },
    { key: 'READY', label: 'Ready for Pickup', icon: '🛍️' },
    { key: 'COMPLETED', label: 'Picked Up', icon: '✅' },
  ];

  get currentIndex() {
    return this.steps.findIndex(s => s.key === this.status);
  }
}
