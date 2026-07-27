import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { Promotion } from '../../../core/models/promotion.model';
import { AdminPromotionService } from '../services/admin-promotion.service';

@Component({
  selector: 'app-admin-promotion-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <app-modal [open]="open" [title]="promotion ? 'Edit Promotion' : 'Add Promotion'" (close)="closed.emit()">
      <div class="field">
        <label for="promo-title">Headline</label>
        <input id="promo-title" [(ngModel)]="title" name="title" placeholder="10% OFF Iced Mana — This Week Only" />
      </div>

      <div class="field">
        <label for="promo-desc">Description</label>
        <input id="promo-desc" [(ngModel)]="description" name="description" placeholder="Use code CHILL10 at checkout on any Iced Mana item." />
      </div>

      <div class="field">
        <label for="promo-btn-label">Button Label</label>
        <input id="promo-btn-label" [(ngModel)]="buttonLabel" name="buttonLabel" placeholder="Shop Iced Mana" />
      </div>

      <div class="field">
        <label for="promo-btn-link">Button Link</label>
        <input id="promo-btn-link" [(ngModel)]="buttonLink" name="buttonLink" placeholder="/shop?category=2" />
      </div>

      <div class="field">
        <label for="promo-sort">Display Order</label>
        <input id="promo-sort" type="number" [(ngModel)]="sortOrder" name="sortOrder" />
      </div>

      <div class="field">
        <label class="checkbox-row"><input type="checkbox" [(ngModel)]="active" name="active" /> Show on homepage</label>
      </div>

      <button class="btn btn-primary btn-block" [disabled]="saving" (click)="save()">
        {{ saving ? 'Saving…' : 'Save Promotion' }}
      </button>
    </app-modal>
  `,
  styles: [`
    .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; min-height: 36px; }
  `],
})
export class AdminPromotionFormModalComponent implements OnChanges {
  @Input() open = false;
  @Input() promotion: Promotion | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  title = '';
  description = '';
  buttonLabel = '';
  buttonLink = '';
  sortOrder = 0;
  active = true;
  saving = false;

  constructor(private promotions: AdminPromotionService) {}

  ngOnChanges() {
    if (!this.open) return;

    if (this.promotion) {
      this.title = this.promotion.title;
      this.description = this.promotion.description ?? '';
      this.buttonLabel = this.promotion.buttonLabel ?? '';
      this.buttonLink = this.promotion.buttonLink ?? '';
      this.sortOrder = this.promotion.sortOrder;
      this.active = this.promotion.active;
    } else {
      this.title = '';
      this.description = '';
      this.buttonLabel = '';
      this.buttonLink = '';
      this.sortOrder = 0;
      this.active = true;
    }
  }

  save() {
    if (!this.title.trim()) return;
    this.saving = true;

    const payload = {
      title: this.title.trim(),
      description: this.description.trim(),
      buttonLabel: this.buttonLabel.trim(),
      buttonLink: this.buttonLink.trim(),
      active: this.active,
      sortOrder: this.sortOrder,
    };

    const result$ = this.promotion
      ? this.promotions.updatePromotion(this.promotion.id, payload)
      : this.promotions.createPromotion(payload);

    result$.subscribe(res => {
      this.saving = false;
      if (res) this.saved.emit();
    });
  }
}
