import { Component } from '@angular/core';
import { InfoPageComponent } from './info-page.component';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [InfoPageComponent],
  template: `<app-info-page title="Contact Us" [html]="html"></app-info-page>`,
})
export class ContactPageComponent {
  html = `
    <p><strong>Address:</strong> 048 Kay Piskal Rd, Brgy. Tigbe, Norzagaray, Bulacan</p>
    <p><strong>Email:</strong> hello@homebybami.example</p>
    <p><strong>Hours:</strong> Tuesday–Sunday 5:00 PM–12:00 MN · Monday Closed</p>
  `;
}
