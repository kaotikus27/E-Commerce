import { Component } from '@angular/core';
import { InfoPageComponent } from './info-page.component';

@Component({
  selector: 'app-faq-page',
  standalone: true,
  imports: [InfoPageComponent],
  template: `<app-info-page title="Frequently Asked Questions" [html]="html"></app-info-page>`,
})
export class FaqPageComponent {
  html = `
    <h3>How far ahead can I order?</h3>
    <p>Order any time during business hours for pickup as soon as 15 minutes later.</p>
    <h3>Do you offer delivery?</h3>
    <p>Not yet — we're pickup-only for now to keep everything as fresh as possible.</p>
    <h3>Can I customize my drink?</h3>
    <p>Yes! Milk type, sugar level, and temperature can all be adjusted when adding an item to your cart.</p>
    <h3>What if an item is unavailable?</h3>
    <p>We'll call the phone number on your order to arrange a substitution or refund.</p>
  `;
}
