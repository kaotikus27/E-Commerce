import { CartItem } from './cart.model';

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CASH_ON_PICKUP' | 'GCASH_MANUAL';
export type PaymentStatus = 'UNPAID' | 'PENDING_VERIFICATION' | 'PAID' | 'FAILED' | 'REFUNDED';

/**
 * What the checkout page builds client-side from the cart, BEFORE it's translated into
 * the backend's wire shape (see CheckoutService.placeOrder) — items here are still the
 * full cart-shaped CartItem[], not what's actually sent over the wire.
 */
export interface OrderRequest {
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  pickupTime: string;
  paymentMethod: PaymentMethod;
  gcashReference?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

/** The flat item shape the backend's OrderItemRequestDto actually expects on POST /orders. */
export interface OrderItemRequest {
  productId: number;
  quantity: number;
  selectedOptions: Record<string, string>;
}

/** Mirrors the backend's OrderItemResponseDto — the shape order items actually come back as from the API. */
export interface OrderItemSummary {
  productId: number;
  productName: string;
  quantity: number;
  selectedOptions: Record<string, string>;
  unitPrice: number;
  lineTotal: number;
}

/** Mirrors the backend's OrderResponseDto (id = orderNumber) — the real shape of a placed/fetched order. */
export interface Order {
  id: string;
  status: OrderStatus;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  pickupTime: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: OrderItemSummary[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  cancelReason?: string;
  notes?: string;
  gcashReference?: string;
}

/** Admin order listing uses the exact same shape the backend returns. */
export type AdminOrder = Order;
