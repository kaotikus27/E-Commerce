import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPromotionService } from '../services/admin-promotion.service';
import { Promotion } from '../../../core/models/promotion.model';
import { AdminPromotionFormModalComponent } from './admin-promotion-form-modal.component';

@Component({
  selector: 'app-admin-promotions-page',
  standalone: true,
  imports: [CommonModule, AdminPromotionFormModalComponent],
  template: `
    <div class="page-header">
      <h1>Promotions</h1>
      <button class="btn btn-primary btn-sm" (click)="openCreate()">+ Add Promotion</button>
    </div>

    <div class="table-wrap card">
      <table>
        <thead>
          <tr>
            <th>Headline</th>
            <th>Button</th>
            <th>Order</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (promo of promotions.promotions(); track promo.id) {
            <tr>
              <td>{{ promo.title }}</td>
              <td>{{ promo.buttonLabel || '—' }}</td>
              <td>{{ promo.sortOrder }}</td>
              <td>
                <button class="avail-toggle" [class.available]="promo.active" (click)="toggle(promo)">
                  {{ promo.active ? '🟢 LIVE' : '🔴 HIDDEN' }}
                </button>
              </td>
              <td class="row-actions">
                <button class="btn btn-secondary btn-sm" (click)="openEdit(promo)">Edit</button>
                <button class="btn btn-secondary btn-sm" (click)="remove(promo)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">No promotions yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <app-admin-promotion-form-modal
      [open]="modalOpen()"
      [promotion]="editing()"
      (closed)="modalOpen.set(false)"
      (saved)="onSaved()">
    </app-admin-promotion-form-modal>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .table-wrap { overflow-x: auto; padding: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 14px; white-space: nowrap; }
    thead th { color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1.5px solid var(--color-subdued-pistachio); }
    tbody tr { border-bottom: 1px solid var(--color-subdued-pistachio); }
    .avail-toggle {
      border: none; background: var(--color-subdued-pistachio); color: var(--color-status-closed);
      font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: var(--radius-pill); min-height: 32px;
    }
    .avail-toggle.available { color: var(--color-status-open); }
    .row-actions { display: flex; gap: 8px; }
    .empty { text-align: center; color: var(--color-text-muted); padding: 32px 0; }
  `],
})
export class AdminPromotionsPageComponent implements OnInit {
  promotions = inject(AdminPromotionService);

  modalOpen = signal(false);
  editing = signal<Promotion | null>(null);

  ngOnInit() {
    this.promotions.loadPromotions();
  }

  openCreate() {
    this.editing.set(null);
    this.modalOpen.set(true);
  }

  openEdit(promo: Promotion) {
    this.editing.set(promo);
    this.modalOpen.set(true);
  }

  onSaved() {
    this.modalOpen.set(false);
  }

  toggle(promo: Promotion) {
    this.promotions.toggleActive(promo.id, !promo.active).subscribe();
  }

  remove(promo: Promotion) {
    if (confirm(`Delete "${promo.title}"? This can't be undone.`)) {
      this.promotions.deletePromotion(promo.id).subscribe();
    }
  }
}
