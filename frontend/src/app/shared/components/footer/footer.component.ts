import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container footer-top">
        <div class="brand-col">
          <img src="assets/logo_bami.jpg" alt="Home Cafe by Bami" class="footer-logo" />
          <p class="muted">A cozy home cafe tucked in Norzagaray, Bulacan. Come for the drinks, stay for the warmth.</p>
        </div>
        <div class="follow-col">
          <h4 class="footer-heading">Follow Along</h4>
          <p class="muted">Follow <strong>Home Cafe by Bami</strong> for more tasty content.</p>
          <div class="socials">
            <a href="https://www.facebook.com/profile.php?id=61589016731023&sk=photos" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="Facebook">
              <svg viewBox="0 0 512 512" fill="currentColor"><path d="M279.14 288l14.22-92.66h-88.91v-56.87c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/></svg>
            </a>
            <a href="https://www.instagram.com/homecafebybami/" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="Instagram">
              <svg viewBox="0 0 448 512" fill="currentColor"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>
            </a>
            <a href="https://www.tiktok.com/@not.bami" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="TikTok">
              <svg viewBox="0 0 448 512" fill="currentColor"><path d="M448,209.9a210.1,210.1,0,0,1-122.8-39.3V349.4A162.6,162.6,0,1,1,185,188.3V278.2a74.6,74.6,0,1,0,52.2,71.2V0l88,0a121.2,121.2,0,0,0,1.9,22.2h0A122.2,122.2,0,0,0,381,102.4a121.4,121.4,0,0,0,67,20.1Z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div class="container footer-bottom">
        <span class="copyright">© 2026 Home by Bami. All rights reserved.</span>
        <ul class="links">
          <li><a routerLink="/track-order">Track Your Order</a></li>
          <li><a routerLink="/contact">Contact Us</a></li>
          <li><a routerLink="/terms">Terms &amp; Conditions</a></li>
        </ul>
      </div>
    </footer>
  `,
  styles: [`
    .footer { background: var(--color-text-chocolate); color: var(--color-subdued-pistachio); padding: 40px 0 16px; margin-top: 48px; }
    .footer-top { display: grid; gap: 28px; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .footer-top { grid-template-columns: 1.3fr 1fr; } }
    .footer-logo { height: 40px; width: auto; object-fit: contain; margin-bottom: 12px; border-radius: var(--radius-sm); }
    .footer-heading { color: var(--color-canvas-oat); margin: 0 0 8px; }
    .muted { color: var(--color-subdued-pistachio); font-size: 14px; opacity: 0.85; margin: 0 0 6px; }
    .socials { display: flex; gap: 10px; margin: 10px 0 0; }
    .social-icon {
      display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;
      border-radius: 50%; background: rgba(251,248,243,0.1); color: var(--color-subdued-pistachio);
      transition: background 0.15s ease, color 0.15s ease;
    }
    .social-icon:hover { background: var(--color-terracotta); color: var(--color-white); }
    .social-icon svg { width: 18px; height: 18px; }
    .footer-bottom {
      display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center; justify-content: space-between;
      border-top: 1px solid rgba(251,248,243,0.15); margin-top: 32px; padding-top: 16px;
    }
    .copyright { font-size: 12px; color: var(--color-subdued-pistachio); opacity: 0.85; }
    ul.links { list-style: none; padding: 0; margin: 0; display: flex; gap: 20px; }
    ul.links a { font-size: 13px; color: var(--color-subdued-pistachio); }
    ul.links a:hover { color: var(--color-terracotta); }
  `],
})
export class FooterComponent {}
