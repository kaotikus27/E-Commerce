import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { AdminProductService } from '../services/admin-product.service';
import { toAbsoluteImageUrl } from '../../../core/utils/image-url.util';
import { Product } from '../../../core/models/product.model';
import { AdminProductFormModalComponent } from './admin-product-form-modal.component';

@Component({
  selector: 'app-admin-products-page',
  standalone: true,
  imports: [CommonModule, AdminProductFormModalComponent],
  template: `
    <div class="page-header">
      <h1>Menu &amp; Inventory</h1>
      <button class="btn btn-primary btn-sm" (click)="openCreate()">+ Add New Item</button>
    </div>

    <div class="table-wrap card">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Item Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (p of products.products(); track p.id) {
            <tr>
              <td><img [src]="imgUrl(p.image)" [alt]="p.name" class="thumb" /></td>
              <td>{{ p.name }}</td>
              <td>{{ p.categoryName }}</td>
              <td>₱{{ p.price.toFixed(2) }}</td>
              <td>
                <button class="avail-toggle" [class.available]="p.available" (click)="toggle(p)">
                  {{ p.available ? '🟢 IN STOCK' : '🔴 OUT OF STOCK' }}
                </button>
              </td>
              <td class="row-actions">
                <button class="btn btn-secondary btn-sm" (click)="openEdit(p)">Edit</button>
                <button class="btn btn-secondary btn-sm" (click)="remove(p)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="empty">No products yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <app-admin-product-form-modal
      [open]="modalOpen()"
      [product]="editing()"
      [categories]="productService.categories()"
      (closed)="modalOpen.set(false)"
      (saved)="onSaved()">
    </app-admin-product-form-modal>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .table-wrap { overflow-x: auto; padding: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 14px; white-space: nowrap; }
    thead th { color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1.5px solid var(--color-subdued-pistachio); }
    tbody tr { border-bottom: 1px solid var(--color-subdued-pistachio); }
    .thumb { width: 44px; height: 44px; object-fit: cover; border-radius: var(--radius-sm); }
    .avail-toggle {
      border: none; background: var(--color-subdued-pistachio); color: var(--color-status-closed);
      font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: var(--radius-pill); min-height: 32px;
    }
    .avail-toggle.available { color: var(--color-status-open); }
    .row-actions { display: flex; gap: 8px; }
    .empty { text-align: center; color: var(--color-text-muted); padding: 32px 0; }
  `],
})
export class AdminProductsPageComponent implements OnInit {
  products = inject(AdminProductService);
  productService = inject(ProductService);

  modalOpen = signal(false);
  editing = signal<Product | null>(null);

  ngOnInit() {
    this.products.loadProducts();
  }

  imgUrl(path: string) {
    return toAbsoluteImageUrl(path);
  }

  openCreate() {
    this.editing.set(null);
    this.modalOpen.set(true);
  }

  openEdit(p: Product) {
    this.editing.set(p);
    this.modalOpen.set(true);
  }

  onSaved() {
    this.modalOpen.set(false);
  }

  toggle(p: Product) {
    this.products.toggleAvailability(p.id, !p.available).subscribe();
  }

  remove(p: Product) {
    if (confirm(`Delete "${p.name}"? This can't be undone.`)) {
      this.products.deleteProduct(p.id).subscribe();
    }
  }
}
