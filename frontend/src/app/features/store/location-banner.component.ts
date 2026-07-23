import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-location-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="banner">
      <div class="container banner-row">
        <span class="status" [class.open]="store.isOpen()" [class.closed]="!store.isOpen()">
          {{ store.isOpen() ? '● Open Now' : '● Closed' }} · Today {{ store.todayHoursLabel() }}
        </span>
        <span class="address">📍 {{ store.address }}</span>
        <a class="map-link" [href]="store.mapUrl" target="_blank" rel="noopener">Get Directions →</a>
      </div>
    </div>
  `,
  styles: [`
    .banner { background: var(--color-espresso); color: var(--color-cream); font-size: 13px; }
    .banner-row {
      display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; justify-content: center;
      padding: 8px 16px; text-align: center;
    }
    .status { font-weight: 700; }
    .status.open { color: #A9D18E; }
    .status.closed { color: #E29B9B; }
    .address { opacity: 0.9; }
    .map-link { text-decoration: underline; font-weight: 600; color: var(--color-cream); }
    @media (min-width: 720px) { .banner-row { justify-content: space-between; } }
  `],
})
export class LocationBannerComponent {
  store = inject(StoreService);
}
