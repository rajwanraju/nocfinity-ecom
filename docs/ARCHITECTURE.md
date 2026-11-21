# Architecture

Nocfinity is split into a stateless Laravel JSON API and a Next.js application that serves both the
storefront and the admin panel. The Next.js server doubles as a Backend-for-Frontend (BFF): it holds
the API bearer token in an httpOnly cookie and proxies state-changing requests. The browser never
sees a Laravel token, and the API never renders HTML.

## Runtime topology

```
Browser
  │  HTML/RSC, httpOnly session cookie
  ▼
Next.js 16 (App Router)
  ├─ Server components ── apiFetch (server-side bearer) ─┐
  ├─ /api/auth/*, /api/cart/*, /api/checkout,           │
  │  /api/orders/*, /api/admin/[...path]  (BFF)         │
  └─ proxy.ts: route guards + per-request CSP nonce     │
                                                        ▼
                                              Laravel 12 API (/api/v1)
                                                ├─ Sanctum bearer tokens (customer | staff)
                                                ├─ Spatie permissions on every admin route
                                                ├─ Services: pricing, cart, coupon, checkout,
                                                │  orders, auth, Stripe gateway
                                                ├─ MySQL 8.4
                                                └─ Stripe API + signed webhooks
Queue worker (notifications, webhook side effects)
Scheduler (orders:expire-pending hourly)
```

Local development serves Next on `:3000` and Laravel on `:8000` (this workspace uses `:8001` when
8000 is occupied). The Docker stack adds MySQL, Mailpit, a queue worker and a scheduler container.

## Backend

```
backend/
├─ routes/api.php            all /api/v1 routes, middleware and throttles
├─ bootstrap/app.php         API prefix, global middleware, exception registration
├─ app/Http/
│  ├─ Controllers/Api/V1/    thin controllers (customer, checkout, catalog, admin/*)
│  ├─ Requests/              one FormRequest per write, plus validated index filters
│  ├─ Resources/             explicit response shapes (no model serialization)
│  └─ Middleware/            ForceJsonResponse, SecurityHeaders
├─ app/Services/             business logic (see below)
├─ app/Models/               Eloquent models with $fillable and casts
├─ app/Policies/             OrderPolicy and ownership rules
├─ app/Support/              ApiResponse envelope, HtmlSanitizer, Stripe gateway, order numbers
├─ app/Exceptions/           ApiExceptionHandler (consistent envelope + generic 500s)
├─ database/migrations|seeders
└─ tests/Feature|Unit       Pest suites, including the P12 Security folder
```

### Services

| Service | Responsibility |
|---------|----------------|
| `PricingService` | Single source of truth for line prices, subtotal, coupon discount, shipping, tax and total — always from DB products and settings |
| `CartService` | Guest/customer cart resolution, guest-cart merge on login/register, line mutation |
| `CouponService` | Coupon lookup, window/limit/minimum validation, usage accounting |
| `CheckoutService` | Transactional cart → pending order + PaymentIntent, idempotency, stock/coupon revalidation |
| `OrderService` | Status transitions, stock decrement/restore, refunds, order-number sequence |
| `AuthService` | Customer/staff login, registration, password change/reset, token issuance/revocation |
| `SettingService` | Cached shipping/tax/threshold settings |
| `StripeSdkGateway` | PaymentIntent creation, refunds and webhook signature verification (interface allows a fake in tests) |

### Request lifecycle

1. `ForceJsonResponse` and `throttle:api` wrap every API request; `SecurityHeaders` adds CSP,
   nosniff, frame denial, referrer/permissions policies and HSTS on HTTPS.
2. `auth:sanctum` + `abilities:customer|staff` separate the two token audiences.
3. `permission:*` (Spatie) authorizes each admin route; a Super Admin bypasses checks.
4. A FormRequest validates input; unknown fields never reach a model.
5. The controller delegates to a service inside a DB transaction where money or stock changes.
6. A Resource returns only the documented fields inside
   `{ success, message, data, meta, errors }`; errors use the same envelope.

## Frontend

```
frontend/src/
├─ app/(storefront)/         home, catalog, product, cart, checkout, account, auth pages
├─ app/admin/(dashboard)/    dashboard, orders, products, categories, coupons, customers,
│                            staff, roles, activity log, profile
├─ app/api/                  BFF route handlers (auth, cart, checkout, orders, admin catch-all)
├─ proxy.ts                  Next 16 proxy: session guards + nonce-based CSP
├─ lib/api/                  typed server API client and catalog helpers
├─ lib/auth|cart|checkout|orders|admin/
│                            Zod-validated handlers, cookie helpers, origin checks
├─ components/               storefront, admin and shadcn/ui components
└─ lib/security/             CSP builder and JSON-LD serializer
```

- Storefront and admin reads happen in server components inside `<Suspense>` so Cache Components
  can partially prerender the shell; only cart controls, forms, gallery and the admin shell are
  client components.
- Mutations go through BFF handlers that check `Origin`, validate the body with Zod, attach the
  httpOnly bearer, forward the Laravel response (including field errors and `Retry-After`) and
  refresh the server component.
- `proxy.ts` redirects unauthenticated storefront/admin visits, keeps admin routes behind the staff
  cookie, and generates a per-request CSP nonce.

## Data model

The full ERD is in [`ERD.md`](ERD.md). Main aggregates:

- **Identity/RBAC** — `users` (`type` = customer|staff), `roles`, `permissions`, pivot tables,
  `personal_access_tokens`, `password_reset_tokens`.
- **Catalogue** — `categories` (tree), `products`, `product_images`.
- **Selling** — `carts`, `cart_items`, `coupons`, `coupon_usages`, `settings`.
- **Orders** — `orders` (address and item snapshots, money totals, idempotency key),
  `order_items`, `order_status_histories`, `payments`, `stripe_webhook_events`,
  `order_number_sequences`.
- **Audit** — `activity_logs`.

Money is stored as integer cents. Statuses are PHP backed enums over string columns. Deleting a
product preserves order snapshots.

## Key flows

### Authentication

Customer and staff logins are separate endpoints and issue Sanctum tokens with different abilities.
The BFF stores each token in its own httpOnly cookie (`nocfinity_token`, `nocfinity_admin_token`);
the API rejects a customer token on admin routes and a staff token on customer routes. Password
reset uses queued mail with a signed reset token.

### Cart and pricing

Guest carts are identified by an httpOnly cart token (forwarded as `X-Cart-Token`). Lines store the
price at add time only to warn about changes; every read recalculates from the current product and
settings. Login and registration merge the guest cart into the customer cart, capped by stock.

### Checkout and payment

`POST /api/v1/checkout` accepts only address fields and an optional coupon. Inside a transaction it
locks the cart and products, revalidates availability and coupon state, creates a `pending` order
with snapshots, creates a PaymentIntent and clears the cart. A per-customer idempotency key makes a
retried submit return the same order. Stock moves only when the signed
`payment_intent.succeeded` webhook arrives; a duplicate event is ignored by event id, and a payment
that can no longer be fulfilled (stock gone, amount mismatch, expired coupon) is refunded and
cancelled. Unpaid orders expire hourly.

### Admin and RBAC

Every admin screen reads through the BFF and every write is authorized by the API's permission
middleware. Menu items and buttons mirror those permission names, but hiding them is cosmetic.
Order status changes use a server-provided transition map and cannot set `paid`.

## Cross-cutting concerns

- **Security** — server-side pricing, `$fillable` models, FormRequest validation, IDOR policies,
  sanitized product HTML, escaped JSON-LD, strict CORS, security headers, rate limits and signed
  webhooks. Evidence and the production checklist are in [`../SECURITY.md`](../SECURITY.md).
- **Errors** — one exception handler maps validation, auth, authorization, 404 and 5xx into the
  response envelope; 500s are generic unless `APP_DEBUG` is on.
- **Observability** — Laravel logs plus an append-only activity log for admin actions. No metrics
  or tracing backend is wired in.
- **Testing** — Pest feature tests cover the API against SQLite in memory with a fake Stripe
  gateway; Vitest covers BFF handlers, CSP, proxy and components. CI runs both suites plus lint,
  typecheck, formatting and the production build.

## Deployment options

| Mode | How | Notes |
|------|-----|-------|
| Local | `php artisan serve` + `npm run dev` + MySQL + queue/scheduler | Documented in `README.md` |
| Docker Compose | `docker compose up --build` | MySQL, API, queue, scheduler, Mailpit, Next; local/demo only (`artisan serve`) |
| Production | PHP-FPM/nginx (or a container platform) + managed MySQL + Node/Next server + shared cache | Set the values in the `SECURITY.md` checklist; terminate TLS at the proxy and configure trusted proxies |

The API is stateless apart from MySQL and the configured cache/queue store, so it can run multiple
replicas behind a load balancer. The Next.js server holds no persistent state either; its cookies
carry the session.
