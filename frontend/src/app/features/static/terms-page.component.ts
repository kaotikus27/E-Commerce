import { Component } from '@angular/core';
import { InfoPageComponent } from './info-page.component';

@Component({
  selector: 'app-terms-page',
  standalone: true,
  imports: [InfoPageComponent],
  template: `<app-info-page title="Terms & Privacy Policy" [html]="html"></app-info-page>`,
})
export class TermsPageComponent {
  html = `
    <h3>Orders</h3>
    <p>All pickup orders must be collected within 30 minutes of the selected pickup time.</p>
    <h3>Payments</h3>
    <p>Card payments are processed securely; no card details are stored on our servers.</p>
    <h3>Privacy</h3>
    <p>We only use your name and phone number to fulfill and confirm your order.</p>
  `;
}
