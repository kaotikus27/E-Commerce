import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Generic renderer for static info pages (About, FAQ, Contact, Terms) driven by route data. */
@Component({
  selector: 'app-info-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="container info-page">
      <h1>{{ title }}</h1>
      <div class="card content" [innerHTML]="html"></div>
    </section>
  `,
  styles: [`
    .info-page { padding: 24px 16px 48px; max-width: 720px; }
    .content { padding: 24px; line-height: 1.7; font-size: 15px; }
    .content :global(h3) { margin-top: 20px; }
  `],
})
export class InfoPageComponent {
  @Input() title = '';
  @Input() html = '';
}
