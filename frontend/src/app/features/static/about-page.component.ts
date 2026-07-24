import { Component } from '@angular/core';
import { InfoPageComponent } from './info-page.component';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [InfoPageComponent],
  template: `<app-info-page title="About Us" [html]="html"></app-info-page>`,
})
export class AboutPageComponent {
  html = `
    <p>Home by Bami started as a small home kitchen and grew into a cozy neighborhood cafe for
    fresh sourdough, buttery croissants, and slow-brewed coffee — little home, heroic bakes.</p>
    <p>Every loaf is fermented for 48 hours, every pastry is laminated by hand, and every cup
    is pulled to order — because good food shouldn't be rushed, even when you're ordering ahead.</p>
    <h3>Our Values</h3>
    <p>Local ingredients. Honest pricing. No mystery preservatives.</p>
  `;
}
