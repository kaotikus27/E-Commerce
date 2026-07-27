import { Component, Input } from '@angular/core';
import { Faq } from '../../../core/models/faq.model';

@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  template: `
    <div class="card accordion">
      @for (faq of faqs; track faq.id) {
        <details class="item">
          <summary>
            <span>{{ faq.question }}</span>
            <span class="chevron">⌄</span>
          </summary>
          <p class="answer">{{ faq.answer }}</p>
        </details>
      } @empty {
        <p class="empty">No FAQs yet.</p>
      }
    </div>
  `,
  styles: [`
    .accordion { padding: 8px; }
    .item { border-bottom: 1px solid var(--color-subdued-pistachio); padding: 8px 12px; }
    .item:last-child { border-bottom: none; }
    summary {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 4px; font-weight: 600; cursor: pointer; list-style: none; min-height: 44px;
    }
    summary::-webkit-details-marker { display: none; }
    .chevron { transition: transform 0.15s ease; color: var(--color-terracotta); font-size: 18px; }
    details[open] .chevron { transform: rotate(180deg); }
    .answer { padding: 0 4px 14px; margin: 0; line-height: 1.6; font-size: 14px; color: var(--color-text-muted); }
    .empty { text-align: center; color: var(--color-text-muted); padding: 24px; }
  `],
})
export class FaqAccordionComponent {
  @Input() faqs: Faq[] = [];
}
