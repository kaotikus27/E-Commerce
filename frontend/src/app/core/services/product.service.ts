import { Injectable, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Category, Product } from '../models/product.model';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from './mock-data';

/**
 * Fetches catalog data (products & categories) from the Spring Boot backend.
 * Falls back to local mock data if the API is unreachable so the storefront
 * still renders while the backend isn't running (useful during frontend-only dev).
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal<boolean>(true);
  readonly usingFallbackData = signal<boolean>(false);

  constructor(private api: ApiService) {
    this.loadCategories();
    this.loadProducts();
  }

  loadProducts(categoryId?: number, search?: string) {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (categoryId) params['categoryId'] = String(categoryId);
    if (search) params['q'] = search;

    this.api.get<Product[]>('/products', params).pipe(
      tap(data => this.usingFallbackData.set(false)),
      catchError(() => {
        this.usingFallbackData.set(true);
        let data = MOCK_PRODUCTS;
        if (categoryId) data = data.filter(p => p.categoryId === categoryId);
        if (search) {
          const q = search.toLowerCase();
          data = data.filter(p => p.name.toLowerCase().includes(q));
        }
        return of(data);
      })
    ).subscribe(data => {
      this.products.set(data);
      this.loading.set(false);
    });
  }

  loadCategories() {
    this.api.get<Category[]>('/categories').pipe(
      catchError(() => of(MOCK_CATEGORIES))
    ).subscribe(data => this.categories.set(data));
  }

  getProductById(id: number) {
    return this.products().find(p => p.id === id) ?? MOCK_PRODUCTS.find(p => p.id === id);
  }
}
