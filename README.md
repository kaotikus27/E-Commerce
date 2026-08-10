# Home by Bami — Ordering Site

A mobile-friendly ordering web app for a local bakery & coffeeshop, built per `E-Commerce.md`:
**Angular 17 (standalone components + Signals) frontend + Spring Boot 3 (Java 17) backend.**

```
coffeeshop-ecommerce/
├── frontend/   Angular app (menu, cart, checkout, order tracking, account, static pages)
└── backend/    Spring Boot REST API (catalog, orders, store info, auth) + H2 in-memory DB
```

## Quick Start

### 1. Backend (Spring Boot)

Requires **Java 17+**. Maven itself is optional — the included wrapper bootstraps it automatically.

```bash
cd backend
.\mvnw.cmd spring-boot:run    # Windows; use ./mvnw on macOS/Linux
```

The API starts on **http://localhost:8080**. On first boot it seeds the H2 database with the starter
menu (croissants, sourdough, lattes, etc.) — see `catalog/CatalogDataSeeder.java` — and one starter admin
account (see **Admin Dashboard** below). The H2 console is available at `http://localhost:8080/h2-console`
(JDBC URL `jdbc:h2:mem:bakerydb`, user `sa`, no password).

Key endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/products` | List products (`?categoryId=`, `?q=` filters) |
| GET | `/api/v1/products/{id}` | Single product |
| GET | `/api/v1/categories` | List categories |
| GET | `/api/v1/store` | Store hours / open-closed / location |
| POST | `/api/v1/orders` | Place an order (guest or logged in) |
| GET | `/api/v1/orders/{orderNumber}` | Order status |
| POST | `/api/v1/auth/register` / `/login` | Account auth (JWT) |
| GET | `/api/v1/admin/orders` | *(ADMIN)* List all orders, for the Live Orders board |
| PATCH | `/api/v1/admin/orders/{orderNumber}/status` | *(ADMIN)* Advance/cancel an order |
| POST/PUT/DELETE | `/api/v1/admin/products`, `/{id}` | *(ADMIN)* Create/edit/delete a product |
| PATCH | `/api/v1/admin/products/{id}/availability` | *(ADMIN)* Sold-out toggle |
| POST | `/api/v1/admin/uploads/image` | *(ADMIN)* Upload a product photo, returns its URL |

## Admin Dashboard

A starter admin account is seeded on first boot (`auth/AdminDataSeeder.java`):

- **Email:** `admin@homebybami.local`
- **Password:** `ChangeMe123!`

Log in with these at `/login`, then visit `/admin` for the Live Orders kanban board and Menu/Inventory
management. There's no admin sign-up flow — self-registration (`/api/v1/auth/register`) always creates a
plain `CUSTOMER` account. Sales Summary and Store Settings are planned as a follow-up, not yet built.

### 2. Frontend (Angular)

Requires **Node.js 18+** and **npm**.

```bash
cd frontend
npm install
npm start        # ng serve, http://localhost:4200
```

The frontend talks to `http://localhost:8080/api/v1` (see `src/environments/environment*.ts`). If the
backend isn't running, catalog/auth/checkout calls automatically fall back to local mock data so the
site is still fully click-through-able on its own.

To produce a production build:

```bash
npm run build     # outputs to frontend/dist/frontend
```

This was verified to build cleanly in the sandbox used to generate this project (Angular CLI 17,
Node 22): all routes lazy-load correctly and the bundle compiles with zero errors.

## What's implemented

- **Pages**: Home (hero, category shortcuts, featured items, promo, testimonials), Menu/PLP (category
  filter, sort, search, skeleton loading), item customization modal, slide-over cart drawer with pickup
  time picker, one-page Checkout (guest or logged-in, card/cash), Order Confirmation + live-ish Order
  Status tracker (stepper), Account (profile, order history, wishlist placeholder), Login/Register, and
  About/FAQ/Contact/Terms static pages.
- **Shared components**: Navbar (categories, search, mini-cart badge), Footer, ProductCard, Badge, Modal,
  Toast notifications, Loading skeleton, Order status stepper.
- **State/services**: `CartService` (Signals + localStorage), `ProductService`, `AuthService` (JWT),
  `CheckoutService`, `NotificationService`, `StoreService` — plus route guards on `/checkout` (non-empty
  cart) and `/account` (must be logged in), and an HTTP interceptor that attaches the JWT.
- **Backend**: REST controllers/services/repositories for catalog, orders, store info and auth, JPA
  entities on H2, BCrypt password hashing, JWT issuing/validation (with a `role` claim for admin access),
  CORS configured for `http://localhost:4200`, and a `@RestControllerAdvice` returning consistent JSON
  error payloads.
- **Admin Dashboard** (`/admin`, role-gated): Live Orders kanban (Received → Preparing → Ready → Completed,
  plus a Reject/Cancel flow with a reason), and Menu & Inventory (add/edit/delete products, one-tap
  sold-out toggle, image upload). Sales Summary and Store Settings are a planned follow-up.
- **Design**: mobile-first responsive layout, 48px touch targets, and the "Chibi Herono" Oat/Chocolate/Sage/Pistachio
  palette, implemented as plain CSS custom properties (see `frontend/src/styles.css`) rather than
  the Tailwind CLI — the sandbox this was built in had unreliable network access for installing the
  Tailwind/PostCSS toolchain, so hand-written CSS utility classes were used instead to guarantee a
  working build. Swapping in Tailwind later is straightforward since the same token names are used.

## Further reading

- [`docs/delivery-fulfillment.md`](./docs/delivery-fulfillment.md) — how a delivery order goes from checkout quote to a dispatched rider, including the Lalamove webhook signature verification.
- [`docs/user-location-capture.md`](./docs/user-location-capture.md) — how the checkout flow resolves an exact delivery pinpoint (search → disambiguation → draggable map → structured rider notes).

## Notes on verification

- The Angular frontend was installed and built successfully in this environment (`ng build` completes
  with 0 errors, all lazy chunks generated).
- The Spring Boot backend builds successfully via the Maven Wrapper (`.\mvnw.cmd clean install` →
  `BUILD SUCCESS` on Java 17). The Admin Dashboard's backend changes were verified this way; run
  `npm start` / `.\mvnw.cmd spring-boot:run` locally to click through the actual UI end-to-end.
