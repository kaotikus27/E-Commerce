import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid-responsive">
      @for (i of range(count); track i) {
        <div class="skeleton-card card">
          <div class="skeleton-img shimmer"></div>
          <div class="skeleton-line shimmer" style="width:70%"></div>
          <div class="skeleton-line shimmer" style="width:40%"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-card { overflow: hidden; padding-bottom: 12px; }
    .skeleton-img { width: 100%; aspect-ratio: 4/3; }
    .skeleton-line { height: 12px; margin: 8px 12px 0; border-radius: var(--radius-sm); }
    .shimmer {
      background: linear-gradient(90deg, var(--color-subdued-pistachio) 25%, var(--color-canvas-oat) 37%, var(--color-subdued-pistachio) 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
    }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
  `],
})
export class LoadingSkeletonComponent {
  @Input() count = 8;
  range(n: number) { return Array.from({ length: n }, (_, i) => i); }
}
