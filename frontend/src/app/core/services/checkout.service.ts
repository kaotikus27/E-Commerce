import { Injectable, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Order, OrderItemRequest, OrderRequest } from '../models/order.model';

/** Handles order payload submission and (stubbed) payment tokenization. */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  readonly lastOrder = signal<Order | null>(null);

  constructor(private api: ApiService) {}

  /**
   * Places the order against the real backend. Deliberately does NOT fall back to a
   * fake local order on error — a checkout failure needs to be visible to the customer
   * (and to staff, via the admin dashboard), not silently swallowed.
   *
   * The cart's CartItem[] (nested product objects, options as an array) is translated
   * into the flat wire shape the backend's OrderItemRequestDto actually expects
   * (productId + a name->value options map) before posting.
   */
  placeOrder(request: OrderRequest) {
    const items: OrderItemRequest[] = request.items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      selectedOptions: Object.fromEntries(item.selectedOptions.map(o => [o.name, o.value])),
    }));

    const orderData = {
      guestName: request.guestName,
      guestPhone: request.guestPhone,
      guestEmail: request.guestEmail,
      pickupTime: request.pickupTime,
      paymentMethod: request.paymentMethod,
      items,
      notes: request.notes,
      fulfillmentType: request.fulfillmentType,
      deliveryQuotationId: request.deliveryQuotationId,
      deliveryUnitDetails: request.deliveryUnitDetails,
    };

    // The backend endpoint always expects multipart/form-data (so the same endpoint can
    // carry an optional GCash receipt screenshot) — the JSON order fields ride along as a
    // Blob part, per Spring's @RequestPart binding.
    const formData = new FormData();
    formData.append('orderData', new Blob([JSON.stringify(orderData)], { type: 'application/json' }));
    if (request.receiptFile) {
      formData.append('receiptImage', request.receiptFile);
    }

    return this.api.post<Order>('/orders', formData).pipe(
      tap(order => this.lastOrder.set(order))
    );
  }

  getOrderStatus(orderId: string) {
    return this.api.get<Order>(`/orders/${orderId}`).pipe(
      catchError(() => of(this.lastOrder()))
    );
  }
}
