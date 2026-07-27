import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminFaqService } from '../services/admin-faq.service';
import { Faq } from '../../../core/models/faq.model';
import { AdminFaqFormModalComponent } from './admin-faq-form-modal.component';

@Component({
  selector: 'app-admin-faqs-page',
  standalone: true,
  imports: [CommonModule, AdminFaqFormModalComponent],
  template: `
    <div class="page-header">
      <h1>FAQs</h1>
      <button class="btn btn-primary btn-sm" (click)="openCreate()">+ Add FAQ</button>
    </div>

    <div class="table-wrap card">
      <table>
        <thead>
          <tr>
            <th>Question</th>
            <th>Order</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (faq of faqs.faqs(); track faq.id) {
            <tr>
              <td>{{ faq.question }}</td>
              <td>{{ faq.sortOrder }}</td>
              <td>
                <button class="avail-toggle" [class.available]="faq.active" (click)="toggle(faq)">
                  {{ faq.active ? '🟢 SHOWN' : '🔴 HIDDEN' }}
                </button>
              </td>
              <td class="row-actions">
                <button class="btn btn-secondary btn-sm" (click)="openEdit(faq)">Edit</button>
                <button class="btn btn-secondary btn-sm" (click)="remove(faq)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="empty">No FAQs yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <app-admin-faq-form-modal
      [open]="modalOpen()"
      [faq]="editing()"
      (closed)="modalOpen.set(false)"
      (saved)="onSaved()">
    </app-admin-faq-form-modal>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .table-wrap { overflow-x: auto; padding: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 14px; }
    td:first-child { max-width: 360px; white-space: normal; }
    thead th { color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1.5px solid var(--color-subdued-pistachio); }
    tbody tr { border-bottom: 1px solid var(--color-subdued-pistachio); }
    .avail-toggle {
      border: none; background: var(--color-subdued-pistachio); color: var(--color-status-closed);
      font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: var(--radius-pill); min-height: 32px; white-space: nowrap;
    }
    .avail-toggle.available { color: var(--color-status-open); }
    .row-actions { display: flex; gap: 8px; white-space: nowrap; }
    .empty { text-align: center; color: var(--color-text-muted); padding: 32px 0; }
  `],
})
export class AdminFaqsPageComponent implements OnInit {
  faqs = inject(AdminFaqService);

  modalOpen = signal(false);
  editing = signal<Faq | null>(null);

  ngOnInit() {
    this.faqs.loadFaqs();
  }

  openCreate() {
    this.editing.set(null);
    this.modalOpen.set(true);
  }

  openEdit(faq: Faq) {
    this.editing.set(faq);
    this.modalOpen.set(true);
  }

  onSaved() {
    this.modalOpen.set(false);
  }

  toggle(faq: Faq) {
    this.faqs.toggleActive(faq.id, !faq.active).subscribe();
  }

  remove(faq: Faq) {
    if (confirm(`Delete "${faq.question}"? This can't be undone.`)) {
      this.faqs.deleteFaq(faq.id).subscribe();
    }
  }
}
