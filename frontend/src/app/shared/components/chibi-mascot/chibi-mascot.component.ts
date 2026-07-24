import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Sparse, thin line-art chibi hero mascot — used in empty states and confirmations only. */
@Component({
  selector: 'app-chibi-mascot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 120 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="chibi-mascot"
      role="img"
      [attr.aria-label]="label"
    >
      <path d="M45 95 Q40 130 50 145 L70 145 Q80 130 75 95 Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="60" cy="55" r="32" stroke="currentColor" stroke-width="3"/>
      <path d="M50 26 Q60 14 70 26" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M46 55 Q50 60 54 55" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M66 55 Q70 60 74 55" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="42" cy="65" r="3" fill="currentColor" opacity="0.4" stroke="none"/>
      <circle cx="78" cy="65" r="3" fill="currentColor" opacity="0.4" stroke="none"/>
      <path d="M52 68 Q60 74 68 68" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M45 100 Q25 105 22 90" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M75 100 Q95 105 98 90" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M90 85 Q100 80 105 87 Q100 92 92 90 Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
    </svg>
  `,
  styles: [`
    .chibi-mascot { color: var(--color-text-chocolate); display: block; }
  `],
})
export class ChibiMascotComponent {
  @Input() size = 96;
  @Input() label = 'Home by Bami chibi mascot';
}
