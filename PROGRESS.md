# Progress

Last updated: P7.

## Phase status

| Phase | Title | Status | Commit range |
|-------|-------|--------|--------------|
| P0 | Project setup and tooling | ✅ Done | see `git log --oneline` |
| P1 | Database, models, seeders | ✅ Done | see `git log --oneline` |
| P2 | Authentication | ✅ Done | see `git log --oneline` |
| P3 | RBAC | ✅ Done | see `git log --oneline` |
| P4 | Catalog API | ✅ Done | see `git log --oneline` |
| P5 | Cart and coupons | ✅ Done | see `git log --oneline` |
| P6 | Checkout, payment, orders | ✅ Done (live Stripe check blocked) | see `git log --oneline` |
| P7 | Admin API | ✅ Done | see `git log --oneline` |
| P8 | Frontend foundation | ⬜ Not started | — |
| P9 | Storefront pages | ⬜ Not started | — |
| P10 | Checkout UI and account pages | ⬜ Not started | — |
| P11 | Admin panel UI | ⬜ Not started | — |
| P12 | Security hardening | ⬜ Not started | — |
| P13 | Testing and bug fixing | ⬜ Not started | — |
| P14 | Docs, Docker, final QA | ⬜ Not started | — |

## Traceability matrix

Status: ✅ implemented & tested · 🟡 partial · ⬜ planned. Files/tests are filled in the phase that implements each requirement.

| ID | Requirement | Implementation | Test / evidence | Status |
|----|-------------|----------------|-----------------|--------|
| FR-AUTH-1 | Customer register/login/logout/me | `backend/app/Http/Controllers/Api/V1/Auth/CustomerAuthController.php`, `AuthService` | `tests/Feature/Auth/CustomerAuthTest.php` | ✅ |
| FR-AUTH-2 | Separate staff auth, token abilities | `StaffAuthController`, `abilities:customer` / `abilities:staff` in `routes/api.php` | `tests/Feature/Auth/StaffAuthTest.php` | ✅ |
| FR-AUTH-3 | Forgot/reset password, 60 min, single use | `PasswordResetController`, `PasswordResetService`, queued `ResetPasswordNotification` | `tests/Feature/Auth/PasswordResetTest.php` + Mailpit check | ✅ |
| FR-AUTH-4 | Email verification (bonus) | deferred — DECISIONS P2-5 | — | ⬜ |
| FR-AUTH-5 | Login throttle 5 attempts + 429 + Retry-After | `AuthService::guardAgainstThrottle()` | `tests/Feature/Auth/LoginThrottleTest.php` | ✅ |
| FR-AUTH-6 | Generic login error, no email enumeration | `InvalidCredentialsException`; same message for unknown/wrong/inactive | `CustomerAuthTest` + `StaffAuthTest` | ✅ |
| FR-AUTH-7 | Password policy (10+, mixed, number, symbol, pwned) | `app/Support/PasswordRules.php` | `CustomerAuthTest` weak-password dataset | ✅ |
| FR-AUTH-8 | Token revocation + expiry | logout revokes current; password change/reset revokes all (except current) | `CustomerAuthTest`, `PasswordResetTest` | ✅ |
| FR-AUTH-9 | TOTP 2FA for staff (bonus) | deferred — DECISIONS P2-5 | — | ⬜ |
| FR-RBAC-1 | Five roles + custom | `database/seeders/RolePermissionSeeder.php` | `DatabaseSeederTest`, `Rbac\RoleManagementTest` | ✅ |
| FR-RBAC-2 | Granular permission list | `app/Support/PermissionRegistry.php`, `RolePermissionSeeder::PERMISSIONS` | `Rbac\RoleManagementTest` matrix test | ✅ |
| FR-RBAC-3 | Roles↔permissions, staff↔roles | Spatie tables + `StaffService::create/update` | `Rbac\StaffManagementTest` | ✅ |
| FR-RBAC-4 | Super Admin immutability, last one protected | `RoleService`, `StaffPolicy`, `Gate::before` | `Rbac\RoleManagementTest`, `Rbac\StaffManagementTest` | ✅ |
| FR-RBAC-5 | Permission middleware on every admin route | `permission:*` on roles/staff/matrix routes | `Rbac\PermissionMiddlewareTest` role matrix | ✅ |
| FR-RBAC-6 | `/admin/auth/me` effective permissions | `StaffAuthController@me`, `StaffResource` | `StaffAuthTest`, multi-role test | ✅ |
| FR-RBAC-7 | Permission matrix API/UI | `Admin\PermissionController` grouped matrix API | `Rbac\RoleManagementTest` | 🟡 |
| FR-RBAC-8 | Staff management | `Admin\StaffController`, `StaffService` | `Rbac\StaffManagementTest` | 🟡 |
| FR-CAT-1 | Category tree, slug, delete guards | `CategoryService`, `Admin\CategoryController` | `Catalog\AdminCategoryTest` | ✅ |
| FR-CAT-2 | Product fields, images, soft delete | `ProductService`, `Admin\ProductController` | `Catalog\AdminProductTest` | ✅ |
| FR-CAT-3 | Search, category, price, sort, pagination | `CatalogController`, `ProductIndexRequest` | `Catalog\PublicCatalogTest` | ✅ |
| FR-CAT-4 | Product detail, stock status, related | `ProductService::publicShow`, `ProductResource` | `Catalog\PublicCatalogTest` | ✅ |
| FR-CAT-5 | Inactive products hidden | `ProductService::publicQuery` (active + active category) | `Catalog\PublicCatalogTest` | ✅ |
| FR-CAT-6 | Image validation, random names, cleanup | `ProductImageService`, image requests | `Catalog\ProductImageTest` | ✅ |
| FR-CART-1 | DB carts for users, token carts for guests | `CartService::resolve`, `X-Cart-Token` header / httpOnly `cart_token` cookie | `Cart\CartTest` guest cart test | ✅ |
| FR-CART-2 | Add/update/remove/clear, qty caps | `CartController`, `CartService`, `Add/UpdateCartItemRequest` | `Cart\CartTest` lifecycle + caps tests | ✅ |
| FR-CART-3 | Out-of-stock add rejected (422) | `CartService::purchasableProduct` | `Cart\CartTest` unavailable-products test | ✅ |
| FR-CART-4 | Server-calculated totals | `PricingService::quote` (subtotal, discount, shipping, tax, total) | `Cart\CartTest` tampered-price test | ✅ |
| FR-CART-5 | Guest merge on login | `CartService::mergeGuestCart` called from `CustomerAuthController@login` | `Cart\CartMergeTest` | ✅ |
| FR-CART-6 | Cart warnings (inactive/price/stock) | `PricingService::quote` per-line `warnings` + `is_available` | `Cart\CartTest` warnings test | ✅ |
| FR-COUPON-1 | Coupon fields and case-insensitive code | `coupons` schema; uppercase mutator in `Coupon` | `Cart\CouponTest` lowercase apply | ✅ |
| FR-COUPON-2 | Validation on apply/checkout/payment | `CouponService::validate` reused by `CheckoutService::resolveCoupon` and `PaymentWebhookService::couponStillValid` | `Cart\CouponTest`; `Orders\CheckoutTest` expired coupon; `Orders\WebhookTest` coupon expired before payment | ✅ |
| FR-COUPON-3 | Usage increment on paid, decrement on cancel | `PaymentWebhookService::recordCouponUsage`; `OrderService::cancelSideEffects` deletes usage + decrements | `Orders\WebhookTest` paid usage; `Orders\OrderLifecycleTest` cancel restore | ✅ |
| FR-ORDER-1 | Address validation | `CheckoutRequest` (name, phone, line1/2, city, state, postal code, ISO-2 country, notes) | `Orders\CheckoutTest` checkout validation | ✅ |
| FR-ORDER-2 | Server recalculation, minimal client input | `CheckoutService` accepts only address/coupon; cart, prices, totals from DB via `PricingService` | `Orders\CheckoutTest` server totals | ✅ |
| FR-ORDER-3 | Pending order + PaymentIntent + idempotency | `CheckoutService` + `Orders\Payment` + `checkout_idempotency_key` + `StripeGateway` | `Orders\CheckoutTest` creation + idempotent reuse | ✅ |
| FR-ORDER-4 | Stripe Elements card only | backend returns `client_secret`; Elements UI is P10 | `Orders\CheckoutTest` client secret | 🟡 |
| FR-ORDER-5 | Verified webhook marks paid + side effects | `PaymentWebhookService::succeeded` (order/payment/products locked) | `Orders\WebhookTest` paid, stock, coupon, history | ✅ |
| FR-ORDER-6 | Failure never marks paid/decrements stock | `PaymentWebhookService::failed` updates payment only | `Orders\WebhookTest` failed payment | ✅ |
| FR-ORDER-7 | Webhook signature + idempotency | `WebhookController` verifies before parsing; `stripe_webhook_events` unique event id | `Orders\WebhookSignatureTest`, `Orders\WebhookTest` duplicate | ✅ |
| FR-ORDER-8 | Oversell prevention + auto refund | products locked in id order; `refundAndCancel` on stock/amount/coupon failure | `Orders\WebhookTest` oversell, amount mismatch, expired coupon | ✅ |
| FR-ORDER-9 | Race-safe `ORD-YYYY-NNNNNN` | `OrderNumberGenerator` with locked `order_number_sequences` row | `Orders\OrderLifecycleTest` sequential numbers | ✅ |
| FR-ORDER-10 | Item snapshots | `CheckoutService` snapshots name, SKU, price, quantity, line total, image path | `Orders\CheckoutTest` snapshot assertions | ✅ |
| FR-ORDER-11 | Transition table + history + email | `OrderService::transition` + `OrderStatus::canTransitionTo` + queued `OrderStatusChanged` + history row | `Orders\OrderLifecycleTest` valid/invalid transitions | ✅ |
| FR-ORDER-12 | Cancel paid: refund, stock, coupon restore | `OrderService::cancelSideEffects` (refund succeeded payment, restore stock, delete usage) | `Orders\OrderLifecycleTest` paid cancel | ✅ |
| FR-ORDER-13 | Customer order list/detail, IDOR 404 | `OrderController` + `OrderPolicy` (denial → 404) | `Orders\OrderLifecycleTest` list/show isolation | ✅ |
| FR-ORDER-14 | Expire stale pending orders | `orders:expire-pending` command, hourly schedule, configurable window | `Orders\OrderLifecycleTest` expiry | ✅ |
| FR-ADMIN-1 | Dashboard stats + 30-day chart + recent orders | `DashboardService`, `Admin\DashboardController` (`reports.view`) | `Admin\DashboardTest` | ✅ |
| FR-ADMIN-2 | Product admin list/create/edit | `Admin\ProductController` + image endpoints | `Catalog\AdminProductTest`, `Catalog\ProductImageTest` | 🟡 |
| FR-ADMIN-3 | Category tree CRUD | `Admin\CategoryController` | `Catalog\AdminCategoryTest` | 🟡 |
| FR-ADMIN-4 | Orders list/detail/status actions | `Admin\OrderController`, `AdminOrderResource`, `OrderService` (`orders.view` / `orders.update_status`; cancel also needs `orders.cancel`) | `Admin\AdminOrderTest` | ✅ |
| FR-ADMIN-5 | Coupons CRUD | `Admin\CouponController`, `CouponRequest`, `CouponResource` (`coupons.manage`) | `Admin\AdminCouponTest` | ✅ |
| FR-ADMIN-6 | Customers list/detail + order history | `Admin\CustomerController`, `CustomerResource` (customers only; `customers.view`) | `Admin\AdminCustomerTest` | ✅ |
| FR-ADMIN-7 | Roles matrix + staff management | RBAC APIs from P3 (`admin/permissions`, `admin/roles`, `admin/staff`) | `Rbac\*` feature tests | 🟡 |
| FR-ADMIN-8 | Profile + change password | `Admin\ProfileController`, `UpdateProfileRequest`; password via `admin/auth/change-password` | `Admin\AdminProfileTest` | ✅ |
| FR-ADMIN-9 | Responsive admin UI, states, toasts, dialogs | — | — | ⬜ |
| FR-ADMIN-10 | Dark mode + activity log (bonus) | activity log: `ActivityLogger`, `Admin\ActivityLogController` (`roles.manage`); dark mode is P11 | `Admin\ActivityLogTest` | 🟡 |
| FR-UI-1 | All storefront pages | — | — | ⬜ |
| FR-UI-2 | Matches Figma 1440/390 | — | — | ⬜ |
| FR-UI-3 | Consistent visual language on undesigned screens | — | — | ⬜ |
| FR-UI-4 | SEO + SSR product pages | — | — | ⬜ |
| FR-UI-5 | Accessibility | — | — | ⬜ |
| FR-UI-6 | Skeletons, error boundaries, empty states | — | — | ⬜ |
| FR-API-1 | `/api/v1` REST | `backend/bootstrap/app.php` | `tests/Feature/HealthTest.php` | 🟡 |
| FR-API-2 | Response envelope | `backend/app/Support/ApiResponse.php` | `tests/Feature/HealthTest.php` | 🟡 |
| FR-API-3 | Correct status codes | `backend/app/Exceptions/ApiExceptionHandler.php` | `tests/Feature/HealthTest.php` (404) | 🟡 |
| FR-API-4 | Pagination metadata | `ApiResponse::paginationMeta()` used by staff and catalog lists | `StaffManagementTest`, `PublicCatalogTest` | ✅ |
| FR-API-5 | Resources, FormRequests, central handler | Role/Staff resources + request classes, central `ApiExceptionHandler` | Pint + feature tests | ✅ |
| FR-API-6 | API documentation | — | — | ⬜ |
| SEC-1 | Server-side pricing | `PricingService` quotes carts from DB products + settings; client prices ignored | `Cart\CartTest` tampered-price test; reused by P6 | ✅ |
| SEC-2 | bcrypt cost 12 | `backend/.env.example` (`BCRYPT_ROUNDS=12`), `User` hashed cast | `DatabaseSeederTest` asserts hash cost 12 | ✅ |
| SEC-3 | No unsafe SQL | Eloquent/query builder throughout; only parameterless `SELECT 1` health probe | Pint + code review | ✅ |
| SEC-4 | XSS sanitization | `app/Support/HtmlSanitizer.php` (HTMLPurifier allowlist) | `Catalog\AdminProductTest` XSS test | ✅ |
| SEC-5 | IDOR policies | Cart lines resolve inside the caller's cart; `OrderPolicy` + 404 for foreign orders; staff tokens rejected on customer routes; staff IDs 404 on admin customers; blanket `AdminPermissionTest` | `Cart\CartTest`; `Orders\OrderLifecycleTest`; `Admin\AdminPermissionTest` | ✅ |
| SEC-6 | Mass assignment protection | `$fillable` on every model; privileged user fields excluded (`app/Models/User.php`) | `MassAssignmentTest` | ✅ |
| SEC-7 | No sensitive fields in responses | `UserResource` / `StaffResource` explicit field lists | Auth tests assert no password/token leakage | 🟡 |
| SEC-8 | CORS allowlist + security headers | `backend/config/cors.php`, `SecurityHeaders.php`, `frontend/next.config.ts` | `tests/Feature/HealthTest.php` | 🟡 |
| SEC-9 | CSRF posture (SameSite + origin checks) | — | — | ⬜ |
| SEC-10 | Rate limits | named limiters in `AppServiceProvider`; login throttle in `AuthService`; `throttle:coupon`, `throttle:checkout` | `LoginThrottleTest` (429 + Retry-After), `Cart\CouponTest`, checkout limiter | 🟡 |
| SEC-11 | Secure uploads/secrets | `.env.example`, `.gitignore` | review | 🟡 |
| SEC-12 | Stripe signature verification | `StripeSdkGateway::verifyWebhook` called before JSON parsing in `WebhookController` | `Orders\WebhookSignatureTest`; `Orders\WebhookTest` invalid signature | ✅ |
| SEC-13 | Dependency audits | — | — | ⬜ |
| SEC-14 | Validation both sides | Server: FormRequests for every write + query filters | Catalog/RBAC validation tests; frontend schemas from P8 | 🟡 |
| NFR-DB-1 | FKs and unique constraints | `database/migrations/*` | `SchemaTest` + `migrate:fresh --seed` | ✅ |
| NFR-DB-2 | Indexes and soft deletes | `database/migrations/*` (status/created_at/category/search indexes, soft deletes) | `SchemaTest` | ✅ |
| NFR-DB-3 | Eager loading | Catalog queries eager-load category/images; staff loads roles/permissions | Catalog + RBAC tests | ✅ |
| NFR-DB-4 | `migrate:fresh --seed` | `DatabaseSeeder` | command run clean on MySQL 8.4 | ✅ |
| NFR-SEED | Required seed data | `database/seeders/*`, local images in `database/seeders/assets/products` | `DatabaseSeederTest` | ✅ |
| OPS-1 | Thin controllers, services, Pint/ESLint/Prettier/TS strict | Pint, ESLint, Prettier, `tsconfig` strict configured | `pint --test`, `eslint .`, `tsc --noEmit` all clean | 🟡 |
| OPS-2 | Required feature tests | — | — | ⬜ |
| OPS-3 | Logging + health check | `HealthController`, Laravel log channels | `tests/Feature/HealthTest.php` | ✅ |
| OPS-4 | Queue + scheduler docs | `database` queue; queued reset mail verified via Mailpit + `queue:work` | Mailpit message intercepted | 🟡 |
| OPS-5 | Docker Compose (bonus) | — | — | ⬜ |
| OPS-6 | CI (bonus) | — | — | ⬜ |
| OPS-7 | Conventional commit history | this repo | `git log` | 🟡 |
| OPS-DOC | README/architecture/API/security docs | — | — | ⬜ |
| Bonus | 2FA | — | — | ⬜ |
| Bonus | Email verification | — | — | ⬜ |
| Bonus | Dark mode | — | — | ⬜ |
| Bonus | Activity log | — | — | ⬜ |
| Bonus | Docker | — | — | ⬜ |
| Bonus | CI | — | — | ⬜ |
| Bonus | Product reviews | — | — | ⬜ (out of scope, documented) |

## P0 report

**Done**

- Laravel 12 + Sanctum 4 + Spatie Permission 8 + Stripe PHP 23 + Pest 4 installed and booting on PHP 8.4 / MySQL 8.4.
- Next.js 16.4 App Router + TypeScript strict + Tailwind 4 + shadcn/ui + react-hook-form + Zod + Recharts + Stripe React installed and booting.
- `.env.example` for both apps, root `.gitignore` that ignores secrets but commits `.env.example`.
- CORS allowlist, Laravel security headers, Next.js security headers, central exception renderer, standard envelope, named rate limiters, health endpoint.
- Pint clean; ESLint clean; Prettier configured; TypeScript strict clean; 2 feature tests passing.

**Not done / risks**

- Figma file is not available in the workspace — see DECISIONS P0-1.
- CSP for the Next.js app is deliberately deferred to P8 (nonce-based).
- No Docker yet (P14 bonus).

**Next:** P1 — database, models, seeders.

## P1 report

**Done**

- Full MySQL schema: users (+type/is_active/phone/last_login), Spatie tables, categories, products, product_images, carts, cart_items, coupons, coupon_usages, orders, order_items, order_status_histories, payments, stripe_webhook_events, order_number_sequences, settings, activity_logs.
- Foreign keys, unique constraints, indexes, soft deletes (categories/products/coupons).
- PHP backed enums for user type, order status (with the binding transition table), coupon type, payment status, setting type.
- Models with `$fillable`, casts and relationships; privileged user fields excluded from mass assignment.
- `SettingService` with typed, cached settings (shipping fee 999¢, free threshold 10000¢, tax 0).
- Seeders: 13 permissions, 5 roles, Super Admin + 4 staff, 5 customers, 3-level category tree (13 nodes), 26 products, 30 local images, 3 coupons (incl. expired), 6 orders covering every status + payments/history/coupon usage.
- ER diagram (`docs/ERD.md`).
- 10 tests passing (76 assertions), including bcrypt cost 12 and mass-assignment rejection.
- `php artisan migrate:fresh --seed` verified on MySQL 8.4; `storage:link` verified.

**Not done / risks**

- Seed orders do not decrement stock by design (P1-12).
- Scope/visibility filtering of inactive products and trashed rows is enforced in P4.
- Orders/coupons business rules (usage increments, refunds) are implemented in P5/P6, not by seeders.

**Next:** P2 — authentication, throttling, password reset.

## P2 report

**Done**

- Customer auth: `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me`, `POST /auth/change-password` with `customer`-ability tokens.
- Staff auth on a separate `/admin/auth/*` surface with `staff`-ability tokens; customer tokens are rejected on staff routes and vice versa. `GET /admin/auth/me` returns the effective role/permission set (builds on P3).
- Login throttle: 5 failed attempts per lowercased email + IP → `429` with `Retry-After`; successful login clears the counter.
- Generic credential error (identical message and status for unknown email, wrong password and inactive account) so accounts cannot be enumerated.
- Password policy 10+ chars, mixed case, number, symbol, and Laravel's `uncompromised()` check (disabled only in tests via `PASSWORD_CHECK_PWNED=false`).
- Forgot/reset password: queued notification, 60-minute single-use token, all tokens revoked on reset; the link targets the Next.js `/reset-password` page.
- Tokens revoked on logout; password change revokes every other token but keeps the current session.
- `UserResource` / `StaffResource` return explicit fields — no password hash or token leakage.
- 36 tests / 233 assertions green; Pint clean. Reset mail verified end-to-end in Mailpit through the database queue.

**Not done / risks**

- Email verification (FR-AUTH-4) and staff TOTP 2FA (FR-AUTH-9) are bonus items and are deferred (DECISIONS P2-5).
- The pwned-password check is disabled in the test suite for determinism; production defaults to enabled.
- BFF cookie transport, CSRF origin checks and login UI are frontend work scheduled for P8–P10.

**Next:** P3 — RBAC: gates, permission middleware, roles/permissions API, staff CRUD, Super Admin immutability.

## P3 report

**Done**

- `PermissionRegistry` is the single source of truth for the 13 permissions grouped into six matrix groups (catalog, orders, marketing, customers, reports, administration).
- Five seeded roles finalized; Admin now holds `staff.manage` but not `roles.manage`, so roles and the permission matrix remain Super-Admin-only. Custom roles are supported.
- `Gate::before` lets Super Admin bypass permission checks; it deliberately does not bypass target-level policy abilities, so Super Admin accounts stay immutable.
- Spatie `permission` middleware on every RBAC admin route; customer tokens are rejected by `abilities:staff` before permissions are evaluated.
- Roles API: list/show/create/update/delete with validation, 403 on the system Super Admin role, and 409 when a role is still assigned to staff.
- Grouped permission-matrix API (`GET /admin/permissions`) returns permission groups plus every role's assignments for the P11 checkbox matrix.
- Staff API: paginated/filterable list, create with roles and password policy, update roles/details/is_active, deactivate via DELETE. Deactivation and password changes revoke the staff member's tokens.
- Super Admin protection: accounts cannot be updated or deactivated through the API, staff cannot modify themselves, and only a Super Admin may assign the Super Admin role (no escalation).
- 26 RBAC tests green (62 total / 361 assertions); Pint clean; real HTTP smoke test against MySQL verified login → matrix → staff list.

**Not done / risks**

- The matrix and staff screens are UI work for P11; this phase delivers the APIs.
- Order/cart policies (SEC-5) arrive with their endpoints in P5/P6.
- Staff DELETE deactivates rather than removes the row by design (DECISIONS P3-4).

**Next:** P4 — catalog API: categories, products, images, public filters/search/sort/pagination.

## P4 report

**Done**

- Category tree: one-query nested tree, active-only public view, admin CRUD with auto slugs, cycle prevention and 409 delete guards for children/products (including soft-deleted rows).
- Product CRUD: unique SKU/slug, integer-cent prices, discount must be lower than price (also on partial updates), soft delete with image rows/files removed.
- Descriptions sanitized on write with HTMLPurifier (safe tag allowlist, no scripts/handlers/`javascript:` URLs).
- Public catalog: `GET /categories`, `GET /products` (search name/SKU/description, category subtree, effective-price range, price/newest sorting, pagination), `GET /products/{slug}` with images, stock status from the settings threshold, and related products. Inactive products and inactive categories are never exposed.
- Images: jpg/jpeg/png/webp up to 2 MB, random stored filenames, first image auto-primary, single-primary enforcement, reorder endpoint, file deletion with next-image promotion, and cross-product access returns 404.
- Admin catalog routes are permission-gated (`categories.manage`, `products.view/create/edit/delete`) and use explicit `:id` bindings; public routes use slugs.
- 34 catalog tests green (96 total / 516 assertions); Pint clean; public list/detail and category tree smoke-tested over HTTP against MySQL.

**Not done / risks**

- Admin product/category screens are P11 UI work; this phase delivers the APIs.
- Image "replace" is implemented as upload + delete; there is no in-place file swap endpoint.
- Description HTML is sanitized on write; existing rows must be re-saved if the allowlist changes.

**Next:** P5 — cart and coupons: guest/user carts, merge on login, stock and totals, coupon validation.

## P5 report

**Done**

- Guest carts keyed by a UUID `cart_token` (accepted via `X-Cart-Token` or httpOnly cookie, returned in `meta.cart_token` and set as a 30-day cookie); customers always resolve to their unique DB cart. A guest token presented alongside a customer token is merged before the request is served.
- Cart lifecycle: `GET /cart`, `POST /cart/items`, `PATCH|DELETE /cart/items/{id}`, `DELETE /cart`, plus coupon apply/remove. Quantities are 1…min(stock, `cart.max_quantity_per_line`); out-of-stock, inactive products and inactive categories are rejected with 422.
- `PricingService` is the only money calculator: current effective price per line, subtotal, coupon discount (percentage floored + `max_discount_amount` cap, fixed capped at subtotal), shipping (free at the post-discount threshold), tax and total. Stored `unit_price` is a change-detection snapshot only.
- Cart responses flag unavailable lines (`product_inactive`, `category_inactive`, `out_of_stock`, `insufficient_stock`, `price_changed`) and exclude unavailable lines from totals.
- Login merges the guest cart: quantities summed and capped by stock/per-line cap, unavailable products dropped, and the guest cart deleted so a repeated token cannot merge twice. A guest coupon is adopted only when the user cart has none.
- `CouponService` centralizes expiry, not-started, inactive, total-limit, per-user-limit and minimum-order checks with a specific message for each; expired coupons are detached on read. Coupon attempts are throttled (`throttle:coupon`).
- Cart lines are looked up inside the caller's cart only (404 otherwise); staff tokens are rejected on customer cart endpoints.
- 20 cart/coupon tests green (116 total / 666 assertions); Pint clean; live HTTP smoke test against MySQL verified guest add → `WELCOME10` → discount/shipping/total.

**Not done / risks**

- Per-user coupon limits cannot be enforced for a guest at apply time; checkout (P6) revalidates against the authenticated customer.
- Coupon usage increments/decrements and stock decrements belong to the paid/cancel transaction in P6.
- Checkout UI and cart page are P9/P10 work; this phase delivers the APIs.

**Next:** P6 — checkout, Stripe PaymentIntent, webhook, orders, stock/coupon transactions.

## P6 report

**Done**

- `POST /checkout` (customer token only) accepts address fields plus an optional coupon code, takes `Idempotency-Key` (or generates one), and returns the pending order, grand total and Stripe `client_secret`. The same key returns the same order and intent instead of charging twice. A `checkout_idempotency_key` unique index backs the lookup, and the cart is locked and emptied only after the order exists.
- `CheckoutService` reloads the cart, locks products in id order, revalidates availability/quantity/coupon, and recalculates every amount through `PricingService`; the client cannot send items or prices. Order items snapshot product name, SKU, unit price, quantity, line total and image. A locked `order_number_sequences` row allocates `ORD-YYYY-NNNNNN`.
- Stripe is behind `App\Support\Stripe\StripeGateway` (`StripeSdkGateway` in production, `FakeStripeGateway` in tests). Payment intents carry `order_id`, `order_number` and `user_id` metadata and an `order-{id}-payment` idempotency key. `payments.client_secret` is stored but hidden from serialization.
- `POST /webhooks/stripe` verifies the `Stripe-Signature` over the raw body before parsing, then records the event id in `stripe_webhook_events`; duplicates are ignored. The service locks order, payment and products, checks amount and coupon validity, then decrements stock, records coupon usage, marks payment/order paid, writes history and queues `OrderStatusChanged`.
- Failure paths: `payment_intent.payment_failed` marks only the payment failed (order stays pending, no stock moves). Oversell, amount mismatch or an expired coupon at payment time triggers a Stripe refund, cancellation, history row and notification. Unknown event types are stored without side effects.
- `OrderService` owns the transition table (`pending → paid → processing → shipped → delivered`, cancellable states) and rejects invalid moves with 409. Cancelling pending releases the PaymentIntent; cancelling paid refunds, restores stock and removes coupon usage. `orders:expire-pending` runs hourly with a configurable window.
- `GET /orders` (paginated, own orders) and `GET /orders/{order}` use `OrderPolicy`; a foreign order returns 404. The checkout route is rate-limited (`throttle:checkout`).
- 26 order tests green (142 total / 842 assertions); Pint clean; bad-signature webhook (400) and unauthenticated checkout/orders (401) smoke-tested over HTTP against MySQL.

**Not done / risks**

- The DoD's live Stripe test-card run is blocked: local `.env` has no `STRIPE_KEY`, `STRIPE_SECRET` or `STRIPE_WEBHOOK_SECRET`. Tests exercise the fake gateway with real HMAC signature verification. Add test keys and repeat success/decline before the demo.
- Refunds/PaymentIntent cancellations execute inside the DB transaction. A Stripe outage can hold locks or roll back the local cancellation after Stripe accepted the refund; the provider call is idempotency-keyed and retry-safe, but a queued outbox would be safer at scale.
- Coupon usage and stock are adjusted only when the paid webhook wins the pending-state check; a webhook for an order already cancelled by the expiry command is ignored (Stripe's refund path is unaffected).
- Order confirmation/My Orders pages and Stripe Elements belong to P9/P10; this phase delivers the APIs.

**Next:** P7 — admin API: dashboard, order management/status updates, coupons CRUD, customers, staff profile.

## P7 report

**Done**

- `GET /admin/dashboard` (`reports.view`) returns today's order count and captured revenue, total customers, active low-stock count, a fixed 30-day sales series (zero-filled for days without paid orders) and the five most recent orders. All figures are aggregated server-side; `DashboardService` uses `DATE(paid_at)` so the same query runs on SQLite and MySQL.
- `GET /admin/orders` paginates with status filter and search over order number/customer name/email; `GET /admin/orders/{id}` returns items, payment, status history and server-computed `valid_transitions`. `PATCH /admin/orders/{id}/status` reuses `OrderService::transition` (history row, queued email, cancel side effects) and returns 409 for a transition the table forbids.
- Admin status updates deliberately exclude `paid` — only the verified Stripe webhook can mark an order paid. Cancelling additionally requires `orders.cancel` on top of `orders.update_status`, so customer-support staff can advance fulfilment without issuing refunds.
- Coupons have full CRUD under `coupons.manage`. Codes are trimmed/uppercased, percentage values are capped at 100, fixed values are cents, `expires_at` must follow `starts_at`, and soft-deleted coupons disappear from the admin list.
- `GET /admin/customers` and `GET /admin/customers/{id}` (`customers.view`) list only `type=customer` accounts with order count, paid lifetime spend, last-order date and (on detail) order history. A staff id returns 404; customer tokens are rejected before the controller.
- `GET/PATCH /admin/profile` let any authenticated staff member read and update only name, phone and email; a changed email clears `email_verified_at`. Password change reuses `POST /admin/auth/change-password` (current password required).
- `ActivityLogger` records order status changes, coupon create/update/delete and profile updates with actor, subject, properties, IP and user agent. Logging is best-effort (`rescue` + report) so an audit failure never rolls back the business action. `GET /admin/activity-logs` is gated by `roles.manage` (Super Admin) to avoid adding a new permission.
- Endpoint and permission map:

  | Method | Path | Permission |
  |--------|------|------------|
  | GET | `/admin/dashboard` | `reports.view` |
  | GET | `/admin/activity-logs` | `roles.manage` |
  | GET | `/admin/profile`, PATCH `/admin/profile` | any staff token |
  | GET | `/admin/orders`, `/admin/orders/{id}` | `orders.view` |
  | PATCH | `/admin/orders/{id}/status` | `orders.update_status` (+ `orders.cancel` when cancelling) |
  | GET/POST | `/admin/coupons`, `/admin/coupons/{id}` etc. | `coupons.manage` |
  | GET | `/admin/customers`, `/admin/customers/{id}` | `customers.view` |

- 38 admin tests green (180 total / 1011 assertions); Pint clean. The blanket `AdminPermissionTest` asserts guest 401, customer-token 403 and no-permission staff 403 across every protected endpoint.

**Not done / risks**

- Admin UI screens, charts and dark mode are P11; this phase delivers the APIs and their contracts.
- The activity log is append-only and unbounded; a retention/pruning policy is deferred (P12/P14).
- `total_spent` sums all paid statuses (paid, processing, shipped, delivered) and excludes refunded/cancelled orders; it is a commercial summary, not an accounting ledger.
- Coupon `PATCH` expects the full editable representation (code/type/value), matching the FormRequest used by create; the P11 form submits all fields.

**Next:** P8 — frontend foundation: design tokens, layouts, typed API client and BFF auth cookie, middleware guards, shared UI, error pages, security headers.

