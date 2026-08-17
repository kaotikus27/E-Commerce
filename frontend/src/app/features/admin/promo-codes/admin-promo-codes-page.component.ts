import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPromoCodeService } from '../services/admin-promo-code.service';
import { PromoCode } from '../../../core/models/promo-code.model';
import { AdminPromoCodeFormModalComponent } from './admin-promo-code-form-modal.component';

@Component({
  selector: 'app-admin-promo-codes-page',
  standalone: true,
  imports: [CommonModule, AdminPromoCodeFormModalComponent],
  template: `
    <div class="page-header">
      <h1>Promo Codes</h1>
      <button class="btn btn-primary btn-sm" (click)="openCreate()">+ Add Promo Code</button>
    </div>

    <div class="table-wrap card">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (promo of promoCodes.promoCodes(); track promo.id) {
            <tr>
              <td class="code-cell">{{ promo.code }}</td>
              <td>{{ promo.discountType === 'PERCENT' ? promo.discountValue + '% off' : '₱' + promo.discountValue.toFixed(2) + ' off' }}</td>
              <td>
                <button class="avail-toggle" [class.available]="promo.active" (click)="toggle(promo)">
                  {{ promo.active ? '🟢 ACTIVE' : '🔴 INACTIVE' }}
                </button>
              </td>
              <td class="row-actions">
                <button class="btn btn-secondary btn-sm" (click)="openEdit(promo)">Edit</button>
                <button class="btn btn-secondary btn-sm" (click)="remove(promo)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="empty">No promo codes yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <app-admin-promo-code-form-modal
      [open]="modalOpen()"
      [promoCode]="editing()"
      (closed)="modalOpen.set(false)"
      (saved)="onSaved()">
    </app-admin-promo-code-form-modal>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .table-wrap { overflow-x: auto; padding: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 14px; white-space: nowrap; }
    thead th { color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1.5px solid var(--color-subdued-pistachio); }
    tbody tr { border-bottom: 1px solid var(--color-subdued-pistachio); }
    .code-cell { font-weight: 700; letter-spacing: 0.03em; }
    .avail-toggle {
      border: none; background: var(--color-subdued-pistachio); color: var(--color-status-closed);
      font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: var(--radius-pill); min-height: 32px;
    }
    .avail-toggle.available { color: var(--color-status-open); }
    .row-actions { display: flex; gap: 8px; }
    .empty { text-align: center; color: var(--color-text-muted); padding: 32px 0; }
  `],
})
export class AdminPromoCodesPageComponent implements OnInit {
  promoCodes = inject(AdminPromoCodeService);

  modalOpen = signal(false);
  editing = signal<PromoCode | null>(null);

  ngOnInit() {
    this.promoCodes.loadPromoCodes();
  }

  openCreate() {
    this.editing.set(null);
    this.modalOpen.set(true);
  }

  openEdit(promo: PromoCode) {
    this.editing.set(promo);
    this.modalOpen.set(true);
  }

  onSaved() {
    this.modalOpen.set(false);
  }

  toggle(promo: PromoCode) {
    this.promoCodes.toggleActive(promo.id, !promo.active).subscribe();
  }

  remove(promo: PromoCode) {
    if (confirm(`Delete "${promo.code}"? This can't be undone.`)) {
      this.promoCodes.deletePromoCode(promo.id).subscribe();
    }
  }
}
