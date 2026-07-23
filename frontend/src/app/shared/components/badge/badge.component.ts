import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span class="badge" [class.badge-sale]="tone === 'sale'">{{ text }}</span>`,
})
export class BadgeComponent {
  @Input() text = '';
  @Input() tone: 'default' | 'sale' = 'default';
}
