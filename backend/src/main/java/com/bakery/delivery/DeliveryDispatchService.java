package com.bakery.delivery;

import com.bakery.order.DeliveryStatus;
import com.bakery.order.FulfillmentType;
import com.bakery.order.Order;
import com.bakery.order.PhoneNumberUtil;
import com.bakery.store.StoreService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Places a real Lalamove order (Phase 2) for an already-placed, already-paid delivery order.
 *  Mutates the given Order in place — persistence/transaction boundary is the caller's job
 *  (OrderService), matching the existing applyReceiptImage() pattern. */
@Service
public class DeliveryDispatchService {

    private final LalamoveClient lalamoveClient;
    private final StoreService storeService;
    private final String defaultServiceType;

    public DeliveryDispatchService(LalamoveClient lalamoveClient, StoreService storeService,
                                    @Value("${lalamove.default-service-type}") String defaultServiceType) {
        this.lalamoveClient = lalamoveClient;
        this.storeService = storeService;
        this.defaultServiceType = defaultServiceType;
    }

    /** Always re-quotes immediately before dispatch using the already-geocoded destination
     *  coordinates (no address lookup) — the checkout-time quote's 5-minute window won't survive
     *  payment verification + kitchen prep, so checking its staleness first has no real payoff.
     *  The customer's paid deliveryFee is untouched; any difference from this fresh quote is
     *  absorbed by the store, not passed to the customer. */
    public void dispatch(Order order) {
        if (order.getFulfillmentType() != FulfillmentType.DELIVERY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only delivery orders can be dispatched.");
        }
        if (order.getLalamoveOrderId() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order has already been dispatched to Lalamove.");
        }

        String storePhone = storeService.getPhone();
        if (storePhone == null || storePhone.isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Store phone number isn't set — add one in Admin → Store Settings before dispatching.");
        }

        // Customers type their phone at checkout in ordinary PH local format (e.g.
        // "09605168262"), and it's stored/displayed that way everywhere else — but Lalamove's
        // recipient.phone strictly requires E.164 (confirmed in production: Lalamove rejected
        // "09605168262" outright with ERR_INVALID_FIELD). Normalize only for this outbound call;
        // the stored guestPhone is left untouched.
        String recipientPhone = PhoneNumberUtil.toE164Philippines(order.getGuestPhone());
        if (recipientPhone == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Customer phone number is missing or not a valid PH mobile number — cannot dispatch to Lalamove.");
        }

        LalamoveQuotation quotation = lalamoveClient.getQuotation(
                storeService.getLatitude(), storeService.getLongitude(), storeService.getAddress(),
                order.getDeliveryLatitude(), order.getDeliveryLongitude(), order.getDeliveryAddress(),
                defaultServiceType
        );

        LalamoveOrder lalamoveOrder = lalamoveClient.placeOrder(
                quotation.quotationId(),
                quotation.originStopId(), storeService.getName(), storePhone,
                quotation.destinationStopId(), order.getGuestName(), recipientPhone, order.getDeliveryUnitDetails()
        );

        order.setLalamoveOrderId(lalamoveOrder.lalamoveOrderId());
        order.setDeliveryStatus(DeliveryStatus.ASSIGNING_DRIVER);
        if (lalamoveOrder.shareLink() != null && !lalamoveOrder.shareLink().isBlank()) {
            order.setTrackingShareLink(lalamoveOrder.shareLink());
        }
    }
}
