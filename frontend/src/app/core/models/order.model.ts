import { CartItem } from './cart.model';

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CASH_ON_PICKUP' | 'GCASH_MANUAL';
export type PaymentStatus = 'UNPAID' | 'PENDING_VERIFICATION' | 'PAID' | 'FAILED' | 'REFUNDED';
export type FulfillmentType = 'PICKUP' | 'DELIVERY';
export type DeliveryStatus = 'NOT_DISPATCHED' | 'ASSIGNING_DRIVER' | 'ON_GOING' | 'PICKED_UP' | 'COMPLETED' | 'REJECTED' | 'CANCELED';

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
  /** Block/Lot/Phase/Gate/landmark rider instructions — plain text, never geocoded. */
  deliveryUnitDetails?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  /** Re-validated and priced authoritatively server-side, never trusted from the client. */
  promoCode?: string;
}

/** The flat item shape the backend's OrderItemRequestDto actually expects on POST /orders. */
export interface OrderItemRequest {
  productId: number;
  quantity: number;
  selectedOptions: Record<string, string>;
  giftWrap: boolean;
}

/** Mirrors the backend's OrderItemResponseDto — the shape order items actually come back as from the API. */
export interface OrderItemSummary {
  productId: number;
  productName: string;
  quantity: number;
  selectedOptions: Record<string, string>;
  unitPrice: number;
  lineTotal: number;
  giftWrap: boolean;
}

/** Mirrors the backend's OrderResponseDto (id = orderNumber, human-readable, display only) —
 *  the real shape of a placed/fetched order. Use publicToken, not id, for any tracking URL or
 *  status lookup — see Order.publicToken on the backend. */
export interface Order {
  id: string;
  /** Unguessable tracking id — use this in order-status URLs, never id. */
  publicToken: string;
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
  promoCode?: string;
  discountAmount?: number;
  createdAt: string;
  cancelReason?: string;
  notes?: string;
  gcashReference?: string;
  receiptImagePath?: string;
  ocrExtractedRef?: string;
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string;
  deliveryFee?: number;
  deliveryUnitDetails?: string;
  deliveryStatus: DeliveryStatus;
  driverName?: string;
  driverPhone?: string;
  driverPlateNumber?: string;
  trackingShareLink?: string;
}

/** Admin order listing uses the exact same shape the backend returns. */
export type AdminOrder = Order;

/** "I lost my link" lookup — requires both fields together (never a bare order number alone,
 *  since it's deliberately guessable — see the field's own doc comment on the backend). */
export interface OrderLookupRequest {
  orderNumber: string;
  guestPhone: string;
}
