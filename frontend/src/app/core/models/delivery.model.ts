/** Mirrors the backend's DeliveryQuoteResponseDto — a Lalamove quotation, valid for 5 minutes. */
export interface DeliveryQuote {
  quotationId: string;
  resolvedAddress: string;
  latitude: number;
  longitude: number;
  feeTotal: number;
  expiresAt: string;
  serviceType: string;
}
