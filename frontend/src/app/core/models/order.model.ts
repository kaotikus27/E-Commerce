import { CartItem } from './cart.model';

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'COMPLETED';

export interface OrderRequest {
  guestName?: string;
  guestPhone?: string;
  pickupTime: string;
  paymentMethod: 'CARD' | 'CASH_ON_PICKUP';
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface Order extends OrderRequest {
  id: string;
  status: OrderStatus;
  createdAt: string;
}
