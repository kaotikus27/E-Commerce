import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { DiscountType, PromoCode } from '../../../core/models/promo-code.model';
import { AdminPromoCodeService } from '../services/admin-promo-code.service';

@Component({
  selector: 'app-admin-promo-code-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <app-modal [open]="open" [title]="promoCode ? 'Edit Promo Code' : 'Add Promo Code'" (close)="closed.emit()">
      <div class="field">
        <label for="promo-code">Code</label>
        <input id="promo-code" [(ngModel)]="code" name="code" placeholder="CHILL10" style="text-transform: uppercase;" />
      </div>

      <div class="field">
        <label for="promo-discount-type">Discount Type</label>
        <select id="promo-discount-type" [(ngModel)]="discountType" name="discountType">
          <option value="PERCENT">Percent off subtotal</option>
          <option value="FIXED">Fixed peso amount off</option>
        </select>
      </div>

      <div class="field">
        <label for="promo-discount-value">{{ discountType === 'PERCENT' ? 'Percent (e.g. 10 = 10%)' : 'Amount (₱)' }}</label>
        <input id="promo-discount-value" type="number" min="0.01" step="0.01" [(ngModel)]="discountValue" name="discountValue" />
      </div>

      <div class="field">
        <label class="checkbox-row"><input type="checkbox" [(ngModel)]="active" name="active" /> Active (usable at checkout)</label>
      </div>

      <button class="btn btn-primary btn-block" [disabled]="saving" (click)="save()">
        {{ saving ? 'Saving…' : 'Save Promo Code' }}
      </button>
    </app-modal>
  `,
  styles: [`
    .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; min-height: 36px; }
  `],
})
export class AdminPromoCodeFormModalComponent implements OnChanges {
  @Input() open = false;
  @Input() promoCode: PromoCode | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  code = '';
  discountType: DiscountType = 'PERCENT';
  discountValue = 0;
  active = true;
  saving = false;

  constructor(private promoCodes: AdminPromoCodeService) {}

  ngOnChanges() {
    if (!this.open) return;

    if (this.promoCode) {
      this.code = this.promoCode.code;
      this.discountType = this.promoCode.discountType;
      this.discountValue = this.promoCode.discountValue;
      this.active = this.promoCode.active;
    } else {
      this.code = '';
      this.discountType = 'PERCENT';
      this.discountValue = 0;
      this.active = true;
    }
  }

  save() {
    if (!this.code.trim() || this.discountValue <= 0) return;
    this.saving = true;

    const payload = {
      code: this.code.trim().toUpperCase(),
      discountType: this.discountType,
      discountValue: this.discountValue,
      active: this.active,
    };

    const result$ = this.promoCode
      ? this.promoCodes.updatePromoCode(this.promoCode.id, payload)
      : this.promoCodes.createPromoCode(payload);

    result$.subscribe(res => {
      this.saving = false;
      if (res) this.saved.emit();
    });
  }
}
