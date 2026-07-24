import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Product } from '../../../core/models/product.model';

export interface ProductPayload {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  image: string;
  badges: string[];
  available: boolean;
  customizationKeys: string[];
}

/**
 * Product/inventory data for the admin Menu & Inventory page. Like AdminOrderService,
 * this does NOT fall back to mock data on error — admin actions need to reflect reality.
 */
@Injectable({ providedIn: 'root' })
export class AdminProductService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private notifications = inject(NotificationService);

  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);

  loadProducts() {
    this.loading.set(true);
    this.api.get<Product[]>('/products').pipe(
      tap(() => this.loading.set(false)),
      catchError(() => {
        this.loading.set(false);
        this.notifications.error('Could not load products. Is the backend running?');
        return of<Product[]>([]);
      })
    ).subscribe(products => this.products.set(products));
  }

  createProduct(payload: ProductPayload) {
    return this.api.post<Product>('/admin/products', payload).pipe(
      tap(created => this.products.update(list => [created, ...list])),
      catchError(() => {
        this.notifications.error('Could not create the product.');
        return of(null);
      })
    );
  }

  updateProduct(id: number, payload: ProductPayload) {
    return this.api.put<Product>(`/admin/products/${id}`, payload).pipe(
      tap(updated => this.products.update(list => list.map(p => (p.id === id ? updated : p)))),
      catchError(() => {
        this.notifications.error('Could not update the product.');
        return of(null);
      })
    );
  }

  deleteProduct(id: number) {
    return this.api.delete<void>(`/admin/products/${id}`).pipe(
      tap(() => this.products.update(list => list.filter(p => p.id !== id))),
      catchError(() => {
        this.notifications.error('Could not delete the product.');
        return of(null);
      })
    );
  }

  toggleAvailability(id: number, available: boolean) {
    this.products.update(list => list.map(p => (p.id === id ? { ...p, available } : p)));
    return this.api.patch<Product>(`/admin/products/${id}/availability`, { available }).pipe(
      catchError(() => {
        this.products.update(list => list.map(p => (p.id === id ? { ...p, available: !available } : p)));
        this.notifications.error('Could not update availability.');
        return of(null);
      })
    );
  }

  uploadImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/admin/uploads/image`, form).pipe(
      catchError(() => {
        this.notifications.error('Could not upload the image.');
        return of(null);
      })
    );
  }
}
