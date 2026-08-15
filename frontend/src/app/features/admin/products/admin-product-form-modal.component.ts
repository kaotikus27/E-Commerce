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

/** Mirrors the backend's PRESET_OPTION_NAMES (ProductService.java) — option names and
 *  required-ness are fixed per preset; only the price per option is per-product-editable. */
const CUSTOMIZATION_PRESET_OPTIONS: Record<string, string[]> = {
  MILK: ['Whole', 'Oat', 'Almond', 'Skim'],
  SUGAR: ['None', 'Light', 'Regular', 'Extra'],
  TEMP: ['Warmed', 'Room Temp'],
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
        @if (milk) {
          <div class="option-prices">
            @for (opt of presetOptions('MILK'); track opt) {
              <label class="option-price-row">
                <span>{{ opt }}</span>
                <span class="price-input"><span class="peso">+₱</span><input type="number" min="0" step="0.05" [(ngModel)]="customizationPrices['MILK'][opt]" [name]="'milk-' + opt" /></span>
              </label>
            }
          </div>
        }
        <label class="checkbox-row"><input type="checkbox" [(ngModel)]="sugar" name="sugar" /> Sugar Level</label>
        @if (sugar) {
          <div class="option-prices">
            @for (opt of presetOptions('SUGAR'); track opt) {
              <label class="option-price-row">
                <span>{{ opt }}</span>
                <span class="price-input"><span class="peso">+₱</span><input type="number" min="0" step="0.05" [(ngModel)]="customizationPrices['SUGAR'][opt]" [name]="'sugar-' + opt" /></span>
              </label>
            }
          </div>
        }
        <label class="checkbox-row"><input type="checkbox" [(ngModel)]="temp" name="temp" /> Warm Up Option (Heated / Room Temp)</label>
        @if (temp) {
          <div class="option-prices">
            @for (opt of presetOptions('TEMP'); track opt) {
              <label class="option-price-row">
                <span>{{ opt }}</span>
                <span class="price-input"><span class="peso">+₱</span><input type="number" min="0" step="0.05" [(ngModel)]="customizationPrices['TEMP'][opt]" [name]="'temp-' + opt" /></span>
              </label>
            }
          </div>
        }
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
    .option-prices { display: flex; flex-direction: column; gap: 4px; margin: 0 0 8px 26px; }
    .option-price-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 400; }
    .price-input { display: flex; align-items: center; gap: 4px; }
    .price-input input { width: 72px; padding: 4px 6px; }
    .peso { color: var(--color-text-muted); }
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
  /** key -> option name -> price delta for this product. Always fully populated (defaulting
   *  to 0) for all 3 presets regardless of which checkboxes are on, so toggling a box back on
   *  doesn't lose whatever was typed in before it was unchecked, within the same edit session. */
  customizationPrices: Record<string, Record<string, number>> = this.emptyCustomizationPrices();
  previewUrl = '';
  private selectedFile: File | null = null;
  saving = false;

  constructor(private products: AdminProductService) {}

  private emptyCustomizationPrices(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const [key, names] of Object.entries(CUSTOMIZATION_PRESET_OPTIONS)) {
      result[key] = Object.fromEntries(names.map(n => [n, 0]));
    }
    return result;
  }

  presetOptions(key: string): string[] {
    return CUSTOMIZATION_PRESET_OPTIONS[key];
  }

  ngOnChanges() {
    if (!this.open) return;
    this.selectedFile = null;
    this.customizationPrices = this.emptyCustomizationPrices();

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
      for (const customization of this.product.customizations) {
        const key = CUSTOMIZATION_NAME_TO_KEY[customization.name];
        if (!key) continue;
        for (const opt of customization.options) {
          this.customizationPrices[key][opt.name] = opt.priceDelta;
        }
      }
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
      customizationPrices: this.customizationPrices,
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
