import { Injectable, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Order, OrderRequest } from '../models/order.model';

/** Handles order payload submission and (stubbed) payment tokenization. */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  readonly lastOrder = signal<Order | null>(null);

  constructor(private api: ApiService) {}

  /** Simulates tokenizing a card via a payment gateway (Stripe/PayPal placeholder). */
  tokenizePayment(cardNumber: string): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => resolve('tok_' + cardNumber.slice(-4) + '_' + Date.now()), 500);
    });
  }

  placeOrder(request: OrderRequest) {
    return this.api.post<Order>('/orders', request).pipe(
      tap(order => this.lastOrder.set(order)),
      catchError(() => {
        const demoOrder: Order = {
          ...request,
          id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          status: 'RECEIVED',
          createdAt: new Date().toISOString(),
        };
        this.lastOrder.set(demoOrder);
        return of(demoOrder);
      })
    );
  }

  getOrderStatus(orderId: string) {
    return this.api.get<Order>(`/orders/${orderId}`).pipe(
      catchError(() => of(this.lastOrder()))
    );
  }
}
