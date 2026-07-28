import { CartItem } from './cart.model';

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CASH_ON_PICKUP' | 'GCASH_MANUAL';
export type PaymentStatus = 'UNPAID' | 'PENDING_VERIFICATION' | 'PAID' | 'FAILED' | 'REFUNDED';
export type FulfillmentType = 'PICKUP' | 'DELIVERY';

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
  /** GCash receipt screenshot — required by the backend when paymentMethod is GCASH_MANUAL.
   *  The reference number is no longer typed by the customer — it's read via OCR off this image. */
  receiptFile?: File;
  fulfillmentType: FulfillmentType;
  /** Required when fulfillmentType is DELIVERY — identifies the server-side quote to consume. */
  deliveryQuotationId?: string;
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
  receiptImagePath?: string;
  ocrExtractedRef?: string;
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string;
  deliveryFee?: number;
}

/** Admin order listing uses the exact same shape the backend returns. */
export type AdminOrder = Order;
