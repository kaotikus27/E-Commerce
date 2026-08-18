import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { StoreService } from '../../core/services/store.service';
import { FaqService } from '../../core/services/faq.service';
import { ContactMessageService } from '../../core/services/contact-message.service';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';

const TOPICS = ['General Inquiry', 'Event or Reservation Request', 'Bulk or Catering Order', 'Feedback', 'Other'];

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FaqAccordionComponent],
  template: `
    <section class="container contact-page">
      <h1>📨 Get in Touch</h1>
      <p class="lede">Got a question, special event request, or just want to say hello? Drop us a line below or visit our cozy cottage in {{ townName() }}!</p>

      <div class="contact-grid">
        <div class="card form-card">
          <h3>✉️ Send Us a Message</h3>

          @if (contact.submitted()) {
            <div class="success-box">
              <p>✅ Message sent — we'll get back to you soon!</p>
              <button type="button" class="btn btn-secondary btn-sm" (click)="startNewMessage()">Send another message</button>
            </div>
          } @else {
            <div class="field">
              <label for="cm-name">Full Name</label>
              <input id="cm-name" [(ngModel)]="name" name="cmName" placeholder="e.g., Juan Dela Cruz" />
            </div>
            <div class="field">
              <label for="cm-email">Email Address</label>
              <input id="cm-email" type="email" [(ngModel)]="email" name="cmEmail" placeholder="e.g., juan@example.com" />
            </div>
            <div class="field">
              <label for="cm-phone">Contact / Mobile Number (Optional)</label>
              <input id="cm-phone" [(ngModel)]="phone" name="cmPhone" placeholder="e.g., +63 912 345 6789" />
            </div>
            <div class="field">
              <label for="cm-topic">What's on Your Mind?</label>
              <select id="cm-topic" [(ngModel)]="topic" name="cmTopic">
                <option value="">Select Topic</option>
                @for (t of topics; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </div>
            <div class="field">
              <label for="cm-message">Your Message</label>
              <textarea id="cm-message" [(ngModel)]="message" name="cmMessage" rows="5" placeholder="Write your message to the team here…"></textarea>
            </div>

            @if (contact.error()) {
              <p class="field-error">{{ contact.error() }}</p>
            }

            <button type="button" class="btn btn-primary btn-block" [disabled]="contact.submitting() || !canSubmit()" (click)="send()">
              {{ contact.submitting() ? 'Sending…' : '📨 Send Message' }}
            </button>
          }
        </div>

        <div class="card find-us-card">
          <h3>📍 Find Us</h3>
          @if (mapEmbedUrl(); as mapUrl) {
            <iframe class="map-embed" [src]="mapUrl" title="Map to the store location" loading="lazy"></iframe>
          }
          <p class="find-us-line">📍 {{ store.address() }}</p>
          <p class="find-us-line">🕐 {{ store.todayHoursLabel() }}</p>
          @if (store.phone()) {
            <p class="find-us-line">📞 {{ store.phone() }}</p>
          }
          <div class="find-us-actions">
            @if (store.mapUrl()) {
              <a [href]="store.mapUrl()" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">🧭 Google Maps</a>
            }
            @if (wazeUrl(); as waze) {
              <a [href]="waze" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">🚗 Waze</a>
            }
          </div>
        </div>
      </div>

      <div class="card faq-card">
        <h3>❓ Frequently Asked Questions</h3>
        <app-faq-accordion [faqs]="faqService.faqs()"></app-faq-accordion>
      </div>
    </section>
  `,
  styles: [`
    .contact-page { padding: 24px 16px 48px; max-width: 1180px; }
    .contact-page h1 { margin-bottom: 6px; }
    .lede { color: var(--color-text-muted); margin-bottom: 24px; max-width: 640px; }
    .contact-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px; }
    @media (min-width: 900px) { .contact-grid { grid-template-columns: 1.3fr 1fr; align-items: start; } }
    .card { padding: 24px; }
    .card h3 { margin: 0 0 16px; }
    .success-box { text-align: center; padding: 24px 0; }
    .success-box p { font-weight: 600; margin-bottom: 16px; }
    .field-error { color: var(--color-error); font-size: 13px; font-weight: 600; margin-bottom: 8px; }
    .map-embed { width: 100%; aspect-ratio: 16 / 9; border: none; border-radius: var(--radius-sm); margin-bottom: 16px; }
    .find-us-line { font-size: 14px; margin: 0 0 8px; line-height: 1.5; }
    .find-us-actions { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .faq-card { padding: 8px 16px 16px; }
    .faq-card h3 { padding: 16px 16px 0; }
  `],
})
export class ContactPageComponent {
  store = inject(StoreService);
  faqService = inject(FaqService);
  contact = inject(ContactMessageService);
  private sanitizer = inject(DomSanitizer);

  topics = TOPICS;
  name = '';
  email = '';
  phone = '';
  topic = '';
  message = '';

  readonly townName = computed(() => {
    const address = this.store.address();
    const parts = address.split(',').map(p => p.trim());
    return parts.length >= 2 ? parts[parts.length - 3] || parts[0] : 'Norzagaray';
  });

  readonly mapEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const lat = this.store.latitude();
    const lng = this.store.longitude();
    if (lat == null || lng == null) return null;
    const delta = 0.006;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat},${lng}&layer=mapnik`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  readonly wazeUrl = computed(() => {
    const lat = this.store.latitude();
    const lng = this.store.longitude();
    return lat != null && lng != null ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : null;
  });

  canSubmit(): boolean {
    return !!this.name.trim() && !!this.email.trim() && !!this.message.trim();
  }

  send() {
    if (!this.canSubmit()) return;
    this.contact.submit({
      name: this.name.trim(),
      email: this.email.trim(),
      phone: this.phone.trim() || undefined,
      topic: this.topic || undefined,
      message: this.message.trim(),
    }).subscribe();
  }

  startNewMessage() {
    this.contact.reset();
    this.name = '';
    this.email = '';
    this.phone = '';
    this.topic = '';
    this.message = '';
  }
}
