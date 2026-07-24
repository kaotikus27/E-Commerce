import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { Category, Product } from '../../../core/models/product.model';
import { AdminProductService } from '../services/admin-product.service';
import { toAbsoluteImageUrl } from '../../../core/utils/image-url.util';

const CUSTOMIZATION_NAME_TO_KEY: Record<string, string> = {
  Milk: 'MILK',
  'Sugar Level': 'SUGAR',
  Temperature: 'TEMP',
};

@Component({
  selector: 'app-admin-product-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <app-modal [open]="open" [title]="product ? 'Edit Item' : 'Add New Item'" (close)="closed.emit()">
      <div class="field">
        <label for="p-name">Item Name</label>
        <input id="p-name" [(ngModel)]="name" name="name" placeholder="Strawberry Matcha Choux" />
      </div>

      <div class="field">
        <label for="p-category">Category</label>
        <select id="p-category" [(ngModel)]="categoryId" name="categoryId">
          @for (c of categories; track c.id) {
            <option [value]="c.id">{{ c.icon }} {{ c.name }}</option>
          }
        </select>
      </div>

      <div class="field">
        <label for="p-price">Base Price (₱)</label>
        <input id="p-price" type="number" min="0" step="0.05" [(ngModel)]="price" name="price" />
      </div>

      <div class="field">
        <label for="p-desc">Description</label>
        <input id="p-desc" [(ngModel)]="description" name="description" />
      </div>

      <div class="field">
        <label for="p-image">Product Image</label>
        <input id="p-image" type="file" accept="image/png,image/jpeg,image/webp" (change)="onFileSelected($event)" />
        @if (previewUrl) {
          <img [src]="previewUrl" alt="Preview" class="preview" />
        }
      </div>

      <div class="field">
        <label class="checkbox-row"><input type="checkbox" [(ngModel)]="milk" name="milk" /> Milk Choice (Oat, Whole, Almond, Skim)</label>
        <label class="checkbox-row"><input type="checkbox" [(ngModel)]="sugar" name="sugar" /> Sugar Level</label>
        <label class="checkbox-row"><input type="checkbox" [(ngModel)]="temp" name="temp" /> Warm Up Option (Heated / Room Temp)</label>
      </div>

      <div class="field">
        <label class="checkbox-row"><input type="checkbox" [(ngModel)]="available" name="available" /> Available Now</label>
      </div>

      <button class="btn btn-primary btn-block" [disabled]="saving" (click)="save()">
        {{ saving ? 'Saving…' : 'Save & Publish' }}
      </button>
    </app-modal>
  `,
  styles: [`
    .preview { width: 120px; height: 90px; object-fit: cover; border-radius: var(--radius-sm); margin-top: 8px; }
    .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; min-height: 36px; }
  `],
})
export class AdminProductFormModalComponent implements OnChanges {
  @Input() open = false;
  @Input() product: Product | null = null;
  @Input() categories: Category[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  name = '';
  description = '';
  price = 0;
  categoryId: number | null = null;
  available = true;
  milk = false;
  sugar = false;
  temp = false;
  previewUrl = '';
  private selectedFile: File | null = null;
  saving = false;

  constructor(private products: AdminProductService) {}

  ngOnChanges() {
    if (!this.open) return;
    this.selectedFile = null;

    if (this.product) {
      this.name = this.product.name;
      this.description = this.product.description;
      this.price = this.product.price;
      this.categoryId = this.product.categoryId;
      this.available = this.product.available;
      this.previewUrl = toAbsoluteImageUrl(this.product.image);
      const keys = new Set(this.product.customizations.map(c => CUSTOMIZATION_NAME_TO_KEY[c.name]));
      this.milk = keys.has('MILK');
      this.sugar = keys.has('SUGAR');
      this.temp = keys.has('TEMP');
    } else {
      this.name = '';
      this.description = '';
      this.price = 0;
      this.categoryId = this.categories[0]?.id ?? null;
      this.available = true;
      this.previewUrl = '';
      this.milk = this.sugar = this.temp = false;
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile = file;
    if (file) this.previewUrl = URL.createObjectURL(file);
  }

  save() {
    if (!this.name.trim() || !this.categoryId) return;
    this.saving = true;

    const buildPayload = (imageUrl: string) => ({
      name: this.name.trim(),
      description: this.description.trim(),
      price: this.price,
      categoryId: this.categoryId!,
      image: imageUrl,
      badges: this.product?.badges ?? [],
      available: this.available,
      customizationKeys: [
        ...(this.milk ? ['MILK'] : []),
        ...(this.sugar ? ['SUGAR'] : []),
        ...(this.temp ? ['TEMP'] : []),
      ],
    });

    const submit = (imageUrl: string) => {
      const payload = buildPayload(imageUrl);
      const result$ = this.product
        ? this.products.updateProduct(this.product.id, payload)
        : this.products.createProduct(payload);
      result$.subscribe(res => {
        this.saving = false;
        if (res) this.saved.emit();
      });
    };

    if (this.selectedFile) {
      this.products.uploadImage(this.selectedFile).subscribe(res => {
        if (res) {
          submit(res.url);
        } else {
          this.saving = false;
        }
      });
    } else {
      submit(this.product?.image ?? '');
    }
  }
}
