import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../../core/services/cart.service';
import { Product } from '../../../../core/models/product.model';
import { SelectedOption } from '../../../../core/models/cart.model';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { CategoryFilterComponent } from '../../components/category-filter.component';
import { ItemModalComponent } from '../../components/item-modal.component';

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, LoadingSkeletonComponent, CategoryFilterComponent, ItemModalComponent],
  template: `
    <section class="menu-hero">
      <h1>Baked Fresh, Served with Love</h1>
    </section>

    <section class="container menu-page">
      <app-category-filter
        [categories]="productService.categories()"
        [selectedCategoryId]="selectedCategoryId()"
        (categoryChange)="onCategoryChange($event)"
        (sortChange)="sortBy.set($event)">
      </app-category-filter>

      @if (productService.loading()) {
        <app-loading-skeleton [count]="8"></app-loading-skeleton>
      } @else if (sortedProducts().length === 0) {
        <p class="empty">No items match your search. Try another category.</p>
      } @else {
        <div class="product-list">
          @for (p of sortedProducts(); track p.id) {
            <app-product-card
              [product]="p"
              layout="list"
              (open)="activeProduct.set($event)"
              (quickAddToCart)="quickAdd($event)">
            </app-product-card>
          }
        </div>
      }
    </section>

    <app-item-modal
      [product]="activeProduct()"
      (close)="activeProduct.set(null)"
      (addedToCart)="onAddedToCart($event)">
    </app-item-modal>
  `,
  styles: [`
    .menu-hero {
      background: linear-gradient(135deg, var(--color-terracotta), var(--color-text-chocolate));
      padding: 48px 16px; text-align: center;
    }
    .menu-hero h1 { color: var(--color-white); margin: 0; font-size: 28px; }
    .menu-page { padding: 24px 16px 48px; }
    .empty { text-align: center; color: var(--color-charcoal); padding: 48px 0; }
    .product-list { display: flex; flex-direction: column; gap: 12px; }
  `],
})
export class MenuPageComponent {
  productService = inject(ProductService);
  cart = inject(CartService);
  route = inject(ActivatedRoute);

  selectedCategoryId = signal<number | null>(null);
  sortBy = signal('featured');
  activeProduct = signal<Product | null>(null);

  sortedProducts = computed(() => {
    const list = [...this.productService.products()];
    switch (this.sortBy()) {
      case 'price-asc': return list.sort((a, b) => a.price - b.price);
      case 'price-desc': return list.sort((a, b) => b.price - a.price);
      case 'rating': return list.sort((a, b) => b.rating - a.rating);
      default: return list;
    }
  });

  constructor() {
    this.route.queryParams.subscribe(params => {
      const categoryId = params['category'] ? Number(params['category']) : null;
      const q = params['q'] ?? undefined;
      this.selectedCategoryId.set(categoryId);
      this.productService.loadProducts(categoryId ?? undefined, q);
    });
  }

  onCategoryChange(id: number | null) {
    this.selectedCategoryId.set(id);
    this.productService.loadProducts(id ?? undefined);
  }

  quickAdd(product: Product) {
    if (product.customizations.length) {
      this.activeProduct.set(product);
      return;
    }
    this.cart.addItem(product, 1, []);
  }

  onAddedToCart(e: { product: Product; quantity: number; options: SelectedOption[] }) {
    this.cart.addItem(e.product, e.quantity, e.options);
  }
}
