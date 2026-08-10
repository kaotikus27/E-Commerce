/** Mirrors the backend's DeliveryQuoteResponseDto — a Lalamove quotation, valid for 5 minutes. */
export interface DeliveryQuote {
  quotationId: string;
  resolvedAddress: string;
  latitude: number;
  longitude: number;
  feeTotal: number;
  expiresAt: string;
  serviceType: string;
  /** Free, keyless Google Maps directions link so the customer can visually verify the pin. */
  googleMapsRouteUrl: string;
}

/** One plausible resolved location for an ambiguous address search. */
export interface GeocodeCandidate {
  label: string;
  latitude: number;
  longitude: number;
}

/** Mirrors the backend's DeliveryQuoteResultDto — either a resolved quote, or a list of
 *  candidates when the searched address matched more than one genuinely different place. */
export interface DeliveryQuoteResult {
  quote: DeliveryQuote | null;
  candidates: GeocodeCandidate[] | null;
}
