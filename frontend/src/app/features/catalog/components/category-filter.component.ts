import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category } from '../../../core/models/product.model';

@Component({
  selector: 'app-category-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-row">
      <button
        class="chip"
        [class.active]="selectedCategoryId === null"
        (click)="select(null)">
        All
      </button>
      @for (c of categories; track c.id) {
        <button
          class="chip"
          [class.active]="selectedCategoryId === c.id"
          (click)="select(c.id)">
          {{ c.icon }} {{ c.name }}
        </button>
      }

      <div class="sort">
        <label for="sort-select" class="visually-hidden">Sort by</label>
        <select id="sort-select" [(ngModel)]="sortValue" (ngModelChange)="sortChange.emit($event)" name="sort">
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>
    </div>
  `,
  styles: [`
    .filter-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px; }
    .chip {
      background: var(--color-white); border: 1.5px solid var(--color-pistachio); border-radius: 999px;
      padding: 8px 16px; font-size: 14px; font-weight: 600; min-height: 44px; color: var(--color-charcoal);
    }
    .chip.active { background: var(--color-sage); border-color: var(--color-sage); color: white; }
    .sort { margin-left: auto; }
    .sort select { min-height: 44px; border-radius: var(--radius-sm); border: 1.5px solid #DDD6CC; padding: 0 10px; background: white; }
  `],
})
export class CategoryFilterComponent {
  @Input() categories: Category[] = [];
  @Input() selectedCategoryId: number | null = null;
  @Output() categoryChange = new EventEmitter<number | null>();
  @Output() sortChange = new EventEmitter<string>();

  sortValue = 'featured';

  select(id: number | null) {
    this.categoryChange.emit(id);
  }
}
