import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaqService } from '../../core/services/faq.service';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';

@Component({
  selector: 'app-faq-page',
  standalone: true,
  imports: [CommonModule, FaqAccordionComponent],
  template: `
    <section class="container faq-page">
      <h1>Frequently Asked Questions</h1>
      <app-faq-accordion [faqs]="faqService.faqs()"></app-faq-accordion>
    </section>
  `,
  styles: [`
    .faq-page { padding: 24px 16px 48px; max-width: 720px; }
  `],
})
export class FaqPageComponent {
  faqService = inject(FaqService);
}
