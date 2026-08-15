import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeliveryStatus, FulfillmentType, OrderStatus } from '../../../core/models/order.model';

interface Step { label: string; icon: string; }

const PICKUP_STEPS: Step[] = [
  { label: 'Order Received', icon: '📝' },
  { label: 'Preparing', icon: '🔥' },
  { label: 'Ready for Pickup', icon: '🛍️' },
  { label: 'Picked Up', icon: '✅' },
];

/** Reflects Lalamove's real rider lifecycle instead of relabeling the pickup steps — a delivery
 *  customer sees "a rider is coming" and "your rider has it" as distinct milestones, not one
 *  generic "ready" step. Splitting these into two only needs deliveryStatus, since DEC-010
 *  already guarantees order.status only reaches READY once a rider is confirmed. */
const DELIVERY_STEPS: Step[] = [
  { label: 'Order Received', icon: '📝' },
  { label: 'Preparing', icon: '🔥' },
  { label: 'Rider Assigned', icon: '🛵' },
  { label: 'Picked Up', icon: '📦' },
  { label: 'Delivered', icon: '✅' },
];

@Component({
  selector: 'app-order-status-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stepper">
      @for (step of steps; track $index) {
        <div class="step" [class.active]="$index <= currentIndex" [class.current]="$index === currentIndex">
          <div class="dot">{{ step.icon }}</div>
          <span class="label">{{ step.label }}</span>
          @if ($index < steps.length - 1) { <div class="line" [class.filled]="$index < currentIndex"></div> }
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
  @Input() fulfillmentType: FulfillmentType = 'PICKUP';
  @Input() deliveryStatus?: DeliveryStatus;

  get steps(): Step[] {
    return this.fulfillmentType === 'DELIVERY' ? DELIVERY_STEPS : PICKUP_STEPS;
  }

  get currentIndex(): number {
    if (this.status === 'RECEIVED') return 0;
    if (this.status === 'PREPARING') return 1;
    if (this.status === 'COMPLETED') return this.fulfillmentType === 'DELIVERY' ? 4 : 3;

    // status === 'READY': DEC-010 only advances a delivery order here once a rider is already
    // confirmed, so this whole stage means "a rider is coming" (index 2) — deliveryStatus just
    // tells us whether that rider has the order in hand yet (index 3) or not.
    if (this.fulfillmentType === 'DELIVERY') {
      return this.deliveryStatus === 'PICKED_UP' ? 3 : 2;
    }
    return 2;
  }
}
