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
    <p><strong>Address:</strong> 221 Maple Street, Riverside Commons</p>
    <p><strong>Phone:</strong> (555) 213-4477</p>
    <p><strong>Email:</strong> hello@sageandcream.example</p>
    <p><strong>Hours:</strong> Mon–Fri 7am–6pm · Sat–Sun 8am–4pm</p>
  `;
}
