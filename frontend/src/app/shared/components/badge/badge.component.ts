import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    <span
      class="badge"
      [class.badge-sale]="tone === 'sale'"
      [class.badge-favorite]="tone === 'favorite'"
      [class.badge-bestseller]="tone === 'bestseller'">{{ text }}</span>
  `,
})
export class BadgeComponent {
  @Input() text = '';
  @Input() tone: 'default' | 'sale' | 'favorite' | 'bestseller' = 'default';
}
