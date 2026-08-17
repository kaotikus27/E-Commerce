export type DiscountType = 'PERCENT' | 'FIXED';

/** Admin-managed promo code (Admin → Promo Codes). */
export interface PromoCode {
  id: number;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  active: boolean;
}

/** Result of validating a customer-typed code against a real subtotal at checkout. */
export interface PromoValidationResult {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
}
