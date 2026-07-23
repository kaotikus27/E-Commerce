import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <h4 style="color: var(--color-cream)">Sage & Cream Bakehouse</h4>
          <p class="muted">Fresh bread, coffee & pastries — baked daily.</p>
        </div>
        <div>
          <h4 style="color: var(--color-cream)">Quick Links</h4>
          <ul>
            <li><a routerLink="/shop">Menu</a></li>
            <li><a routerLink="/about">About Us</a></li>
            <li><a routerLink="/faq">FAQ</a></li>
            <li><a routerLink="/contact">Contact</a></li>
            <li><a routerLink="/terms">Terms & Privacy</a></li>
          </ul>
        </div>
        <div>
          <h4 style="color: var(--color-cream)">Stay in the loop</h4>
          <form class="newsletter" (submit)="$event.preventDefault()">
            <input type="email" placeholder="Your email" aria-label="Email for newsletter" />
            <button class="btn btn-primary btn-sm" type="submit">Sign up</button>
          </form>
          <div class="payments">💳 Visa · Mastercard · 🅿️ PayPal · 📱 Apple Pay</div>
        </div>
      </div>
      <div class="container copyright">© 2026 Sage & Cream Bakehouse. All rights reserved.</div>
    </footer>
  `,
  styles: [`
    .footer { background: var(--color-espresso); color: #E7DFD6; padding: 32px 0 16px; margin-top: 48px; }
    .footer-grid { display: grid; gap: 24px; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .footer-grid { grid-template-columns: repeat(3, 1fr); } }
    .muted { color: #C9BEB2; font-size: 14px; }
    ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    ul a { font-size: 14px; color: #E7DFD6; }
    ul a:hover { color: var(--color-sage); }
    .newsletter { display: flex; gap: 8px; margin-bottom: 12px; }
    .newsletter input { flex: 1; min-height: 44px; border-radius: var(--radius-sm); border: none; padding: 0 12px; }
    .payments { font-size: 13px; color: #C9BEB2; }
    .copyright { border-top: 1px solid rgba(255,255,255,0.1); margin-top: 24px; padding-top: 16px; font-size: 12px; color: #C9BEB2; }
  `],
})
export class FooterComponent {}
