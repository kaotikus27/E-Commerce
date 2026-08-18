---
title: Admin Panel Overview
type: reference
status: current
created: 2026-08-17
updated: 2026-08-17
ai_generated: true
---

# Admin Panel Overview

Extracted from `frontend/src/app/features/admin/` (Angular standalone components). Six admin sections, each backed by its own service under `services/`.

## 1. Live Orders (`orders/admin-orders-board.component.ts`)
- Kanban-style board: **New → Preparing → Ready for Pickup**, polled every 8s (`timer(0, 8000)` + `switchMap`).
- New orders: flash animation + browser tab title alert + audio beep (Web Audio sine tone) on detection of unseen order IDs.
- Payment handling:
  - GCash orders with `PENDING_VERIFICATION` show OCR-extracted reference vs. an editable admin field; **Verify & Accept** is disabled until they match (or OCR unavailable, which allows override).
  - Receipt image upload/replace per order.
  - Cash-on-Pickup orders: manual "Mark as Paid".
- Delivery orders (Lalamove integration):
  - "Call Lalamove Rider" dispatch button.
  - Shows driver name/phone/plate once assigned, tracking share link, delivery status badge.
  - "Mark Ready" blocked for delivery orders until a rider is actually assigned (driverName present or status ON_GOING/PICKED_UP).
  - "Refresh Delivery Status" sync button while delivery is in progress.
- Reject flow: modal with reason field, used for both payment rejection and general order rejection (sets status `CANCELLED`).
- Service: `AdminOrderService` — `loadOrders`, `fetchOrders`, `updateStatus`, `verifyAndAcceptPayment`, `uploadReceipt`, `dispatchDelivery`, `syncDeliveryStatus`, `markPaid`.

## 2. Menu & Inventory (`products/admin-products-page.component.ts` + form modal)
- Table: thumbnail, name, category, price, availability toggle (IN STOCK / OUT OF STOCK), Edit/Delete.
- Add/Edit modal fields: name, category (dropdown), base price, description, image upload with preview.
- Customization presets (checkboxes, mirrors backend `ProductService.java` PRESET_OPTION_NAMES):
  - **Milk** — Whole, Oat, Almond, Skim
  - **Sugar Level** — None, Light, Regular, Extra
  - **Temperature** — Warmed, Room Temp
  - **Ice Level** — No Ice, Standard Ice, Extra Chill
  - Each enabled preset lets admin set a per-option price delta (₱ add-on).
- "Available Now" checkbox controls stock toggle.
- Delete requires confirm dialog.
- Service: `AdminProductService` — `loadProducts`, `toggleAvailability`, `deleteProduct`, `createProduct`, `updateProduct`, `uploadImage`.

## 3. Promotions (`promotions/admin-promotions-page.component.ts` + form modal)
- Table: headline, button label, display order, status (LIVE/HIDDEN toggle), Edit/Delete.
- Add/Edit modal fields: headline, description, button label, button link (e.g. `/shop?category=2`), display order (numeric), "Show on homepage" checkbox.
- Service: `AdminPromotionService` — `loadPromotions`, `toggleActive`, `deletePromotion`, `createPromotion`, `updatePromotion`.

## 4. FAQs (`faqs/admin-faqs-page.component.ts` + form modal)
- Table: question, display order, status (SHOWN/HIDDEN toggle), Edit/Delete.
- Add/Edit modal fields: question, answer (textarea), display order, "Show on FAQ page" checkbox.
- Service: `AdminFaqService` — `loadFaqs`, `toggleActive`, `deleteFaq`, plus create/update (in form modal).

## 5. Store Settings (`settings/admin-store-settings.component.ts`)
- **Emergency Override**: one-click pause/resume of all online ordering (confirm dialog when pausing).
- **Daily Online Ordering Hours**: per-day (Mon–Sun) open/close time, "Until midnight" toggle, "Closed All Day" toggle.
- **Kitchen Buffers**: Lead Time / Prep Time (minutes), Cutoff Before Store Close (minutes).
- **Store Pinpoint**: store address (text or Google Maps link, geocoded on save) and store phone (international format, used for Lalamove dispatch contact).
- **GCash Payment Details**: account name, GCash number, QR code image upload — shown to customers at checkout.
- **Holiday / Special Closures**: add/remove dated closures with optional reason, listed below the form.
- Service: `AdminStoreSettingsService` — `loadSettings`, `loadClosures`, `setPause`, `saveSchedule`, `uploadImage`, `addClosure`, `removeClosure`.

## 6. History (`history/admin-history-page.component.ts`)
- Labeled "Daily Summary & Order History" in the UI.
- Metrics cards: Today's Revenue, Completed Orders Today, Top Sellers Today (ranked list with quantities).
- Full order log table: order #, customer name, phone, status (cancelled highlighted), total, placed date/time.
- Live search box filters by name, order #, or phone (`orderService.searchHistory(query)`).
- Reuses `AdminOrderService` (no separate history service) — computed signals `todayRevenue`, `todayCompletedCount`, `topItemsToday`, `searchHistory`.

## Access Control
- Route-level guard: `core/guards/admin.guard.ts`.
- Entry points: `admin-login-page.component.ts` (auth), `admin-shell.component.ts` (layout/nav shell), `account/admin-account-page.component.ts` (admin account management).
