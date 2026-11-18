# E-commerce Application: Production-Ready Requirements

Stack: Laravel 12 + Sanctum + Spatie Permission, Next.js 14+ (App Router, TypeScript), MySQL 8, Tailwind CSS / shadcn/ui, Stripe Test Mode.

ID prefixes: FR = functional, SEC = security, NFR = non-functional, OPS = operations.

---

## 0. Fixed Decisions and Assumptions

The original brief leaves some points ambiguous. These decisions are binding so the implementation stays consistent.

| # | Topic | Decision |
|---|-------|----------|
| D1 | Money | Stored as integer minor units (cents). Currency: USD. API returns cents plus currency code. |
| D2 | Shipping / tax | Flat shipping fee (configurable), free above a configurable threshold. Tax is a percentage setting, default 0. |
| D3 | User model | Single `users` table with `type` = `customer` or `staff`. Separate login endpoints and separate Sanctum token abilities. Staff routes reject customer tokens and vice versa. |
| D4 | Token storage | Token kept in an httpOnly, Secure, SameSite cookie, handled by Next.js server side (Route Handlers / server actions as a BFF). Never in localStorage. |
| D5 | Cart | Guest cart supported (UUID `cart_token` cookie), merged into the user cart on login. Guest checkout is NOT allowed. |
| D6 | Variants | No product variants. Simple products only. |
| D7 | Payment | Stripe PaymentIntent + webhook. Only a verified webhook marks an order as paid. Webhook handling is idempotent. |
| D8 | RBAC | Spatie Laravel Permission, guard-scoped. Super Admin bypasses via `Gate::before`. |
| D9 | Queue / mail | Queue driver: database. All emails queued, delivered to Mailpit locally. |
| D10 | Search | MySQL `LIKE` / FULLTEXT is sufficient. No external search engine. |

### Order status transitions

| From | Allowed to |
|------|------------|
| pending | paid (webhook only), cancelled |
| paid | processing, cancelled (refund + restore stock) |
| processing | shipped, cancelled (refund + restore stock) |
| shipped | delivered |
| delivered | terminal |
| cancelled | terminal |

Backward transitions are rejected.

---

## 1. Authentication (FR-AUTH)

- FR-AUTH-1: Customer registration (name, email, password, confirmation), login, logout, `me` endpoint.
- FR-AUTH-2: Staff login on a separate endpoint (`/api/v1/admin/auth/login`). Customer tokens cannot access admin APIs and the reverse.
- FR-AUTH-3: Forgot / reset password via email (Mailpit). Token expires in 60 minutes and is single use.
- FR-AUTH-4: Email verification on registration (bonus). If implemented, enforce `verified` before checkout.
- FR-AUTH-5: Login throttle: 5 failed attempts per email + IP, then HTTP 429 with `Retry-After`.
- FR-AUTH-6: Generic error message "Invalid credentials" on failed login. The password reset request must not reveal whether an email exists.
- FR-AUTH-7: Password policy: minimum 10 characters, mixed case, number, symbol, and an uncompromised-password check.
- FR-AUTH-8: Tokens revoked on logout. All other tokens revoked on password change. Tokens have an expiry.
- FR-AUTH-9 (bonus): TOTP 2FA for staff with recovery codes.

## 2. Role-Based Access Control (FR-RBAC)

- FR-RBAC-1: Roles: Super Admin, Admin, Product Manager, Order Manager, Support, plus custom roles.
- FR-RBAC-2: Granular permissions, at minimum: `products.view`, `products.create`, `products.edit`, `products.delete`, `categories.manage`, `orders.view`, `orders.update_status`, `orders.cancel`, `coupons.manage`, `customers.view`, `reports.view`, `roles.manage`, `staff.manage`.
- FR-RBAC-3: Roles have many permissions. Staff have one or more roles.
- FR-RBAC-4: Super Admin has all permissions, cannot be edited, deleted, or demoted by others. The last Super Admin can never be removed.
- FR-RBAC-5: Every admin API route is protected by permission middleware, not by role name.
- FR-RBAC-6: `/admin/auth/me` returns the effective permissions. The frontend hides menus and buttons based on that list. The backend remains the final authority (403 on violation).
- FR-RBAC-7: Roles and Permissions page (Super Admin only) with a matrix UI: permission rows, role columns, checkbox toggles, and save.
- FR-RBAC-8: Staff management: create staff, assign roles, deactivate.

## 3. Catalog (FR-CAT)

- FR-CAT-1: Categories form a tree (`parent_id`), at least 2 levels, unique slug, active flag. Deletion is blocked if children or products exist.
- FR-CAT-2: Products have name, slug, unique SKU, sanitized description, price, discount price (must be lower than price), stock, category, active flag, multiple images (primary + sort order), timestamps, soft delete.
- FR-CAT-3: Public product list supports search (name / SKU / description), category filter (including child categories), price range filter, sorting (price asc/desc, newest), server-side pagination with metadata.
- FR-CAT-4: Product detail by slug returns images, stock status (`in_stock`, `low_stock`, `out_of_stock`), and related products (same category, excluding itself).
- FR-CAT-5: Inactive products are never exposed publicly.
- FR-CAT-6: Image upload validates type (jpg/png/webp) and size (max 2 MB), uses random filenames, and removes files on replace or delete.

## 4. Cart (FR-CART)

- FR-CART-1: Logged-in carts are stored in the database. Guest carts are stored by `cart_token`.
- FR-CART-2: Add, update quantity, remove, clear. Quantity minimum 1, maximum is available stock and a per-line cap (e.g. 10).
- FR-CART-3: Out-of-stock products cannot be added (HTTP 422 with a clear message).
- FR-CART-4: Cart responses contain server-calculated unit price, line total, subtotal, discount, shipping, tax, and total. Client-sent prices are ignored.
- FR-CART-5: Guest cart merges into the user cart on login (quantities summed, capped by stock).
- FR-CART-6: Cart flags items whose product became inactive, out of stock, or changed price.

## 5. Coupons (FR-COUPON)

- FR-COUPON-1: Fields: unique case-insensitive code, type (percentage / fixed), value, min order amount, max discount (percentage type), total usage limit, per-user limit, `starts_at`, `expires_at`, active flag.
- FR-COUPON-2: Validated when applied to the cart and again at checkout and payment time. Specific error for each failure (expired, inactive, limit reached, minimum not met).
- FR-COUPON-3: Usage count increments only when the order becomes paid (inside the transaction). It decrements when a paid order is cancelled.

## 6. Checkout, Payment, Orders (FR-ORDER)

- FR-ORDER-1: Shipping address (name, phone, line1, line2, city, state, postal code, country) validated on the backend.
- FR-ORDER-2: The server recalculates everything from the database. The client sends only cart reference, address, and coupon code.
- FR-ORDER-3: Checkout creates a `pending` order and a Stripe PaymentIntent (server-calculated amount, `order_id` in metadata, idempotency key).
- FR-ORDER-4: Storefront uses Stripe Elements (card only).
- FR-ORDER-5: On a verified `payment_intent.succeeded` webhook: order becomes `paid`, stock is decremented, coupon usage incremented, payment record saved, status history written, email queued.
- FR-ORDER-6: On payment failure the order is never marked paid and stock is not decremented.
- FR-ORDER-7: Webhook verifies the Stripe signature and is idempotent (stores processed event IDs, ignores duplicates).
- FR-ORDER-8: Overselling prevention: DB transaction plus `lockForUpdate()` on products, locked in ID order to avoid deadlocks. If stock is insufficient at payment time, the payment is refunded, the order is cancelled, and the customer sees a clear message.
- FR-ORDER-9: Human-readable, race-safe order number: `ORD-{YYYY}-{6-digit sequence}`.
- FR-ORDER-10: Order items snapshot product name, SKU, unit price, and image at purchase time.
- FR-ORDER-11: Admin status updates follow the transition table, write a status history row, and email the customer.
- FR-ORDER-12: Cancelling a paid order issues a Stripe refund, restores stock, and restores coupon usage.
- FR-ORDER-13: Customers can list and view only their own orders (policy check, 404 for others). Order confirmation page and My Orders page exist.
- FR-ORDER-14: Scheduled command expires stale `pending` orders (e.g. after 60 minutes).

## 7. Admin Panel (FR-ADMIN)

- FR-ADMIN-1: Dashboard: today's orders, today's revenue, total customers, low-stock count, 30-day sales chart, recent orders table.
- FR-ADMIN-2: Products list (search, category filter, pagination) and create/edit (multiple images, price, discount price, stock, SKU, category, active toggle).
- FR-ADMIN-3: Categories CRUD with a tree UI (2+ levels).
- FR-ADMIN-4: Orders list (status filter, search by order number / email) and detail (items, customer, address, payment, status timeline, valid next-status actions only).
- FR-ADMIN-5: Coupons CRUD.
- FR-ADMIN-6: Customers list and detail with order history.
- FR-ADMIN-7: Roles and Permissions matrix page, staff management.
- FR-ADMIN-8: Profile page: update name, change password (current password required).
- FR-ADMIN-9: Responsive layout with sidebar, permission-based menu, loading / empty / error states, toasts, confirm dialogs.
- FR-ADMIN-10 (bonus): Dark mode toggle. Activity log.

## 8. Storefront UI (FR-UI)

- FR-UI-1: Pages: Home, Category/Listing (filters, sort, pagination), Product Detail, Cart, Login, Register, Forgot/Reset password, Checkout, Order Confirmation, My Orders, Order Detail, 404 / error.
- FR-UI-2: Matches the Figma desktop design (1440px) closely. The 390px mobile design is the responsive behavior.
- FR-UI-3: Screens without a Figma design (checkout, orders, auth) reuse the same visual language.
- FR-UI-4: SEO metadata, server-rendered product pages.
- FR-UI-5: Accessibility: semantic HTML, alt text, visible focus, keyboard navigation, sufficient contrast.
- FR-UI-6: Skeleton loaders, error boundaries, empty states.

## 9. API Standards (FR-API)

- FR-API-1: Base path `/api/v1`. RESTful endpoints.
- FR-API-2: Consistent envelope: `{ success, message, data, meta, errors }`.
- FR-API-3: Correct status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500.
- FR-API-4: Pagination metadata: `current_page`, `per_page`, `total`, `last_page`.
- FR-API-5: API Resources for output, FormRequests for validation, one central exception handler (no stack traces in production).
- FR-API-6: Documentation as a Postman collection or OpenAPI/Markdown file.

## 10. Security (SEC)

- SEC-1: Prices, discounts, shipping, tax, and totals are calculated on the backend only. Tampered prices and expired or invalid coupons are rejected.
- SEC-2: Passwords hashed with bcrypt (cost 12).
- SEC-3: SQL injection protection: Eloquent / query builder only, no unsafe raw SQL.
- SEC-4: XSS protection on all user content (product descriptions, names, addresses). Sanitize rich text on the server. Avoid unsanitized `dangerouslySetInnerHTML`.
- SEC-5: IDOR protection via policies on orders, carts, and addresses.
- SEC-6: Mass assignment protection (`$fillable`). `type`, roles, and permissions are never accepted from public input.
- SEC-7: API responses never contain password hashes, remember tokens, Stripe secrets, or internal-only fields.
- SEC-8: Strict CORS allowlist. Security headers in Laravel and `next.config`: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS, Permissions-Policy.
- SEC-9: CSRF: with cookie-based sessions on the Next.js BFF, use SameSite cookies and origin checks. Bearer-token API calls from the BFF are not CSRF-exposed.
- SEC-10: Rate limits on login, register, password reset, coupon apply, checkout, and general API.
- SEC-11: Secure file uploads, secrets only in `.env`, `.env.example` committed, `.env` git-ignored.
- SEC-12: Stripe webhook signature verification. Card data never touches our servers.
- SEC-13: Dependency audits (`composer audit`, `npm audit`) with results documented.
- SEC-14: Validation on frontend and backend. The backend is the source of truth.

## 11. Database (NFR-DB)

Minimum tables: `users`, `password_reset_tokens`, `personal_access_tokens`, `roles`, `permissions`, `role_user` / `permission_role` (or Spatie equivalents), `categories`, `products`, `product_images`, `carts`, `cart_items`, `coupons`, `coupon_usages`, `orders`, `order_items`, `order_status_histories`, `payments`, `stripe_webhook_events`, `order_number_sequences`, `settings`, `activity_logs` (bonus).

- NFR-DB-1: Foreign keys everywhere. Unique constraints on slug, SKU, order number, email, coupon code.
- NFR-DB-2: Indexes on status, `created_at`, category, and search columns. Soft deletes where sensible.
- NFR-DB-3: Eager loading to avoid N+1 queries.
- NFR-DB-4: Migrations and seeders work with `php artisan migrate:fresh --seed`.

## 12. Seed Data (NFR-SEED)

- Default Super Admin account (credentials documented in README).
- All five roles with correct permission sets.
- Category tree (2+ levels), at least 20 products with locally stored images (no external dependency).
- 3 sample coupons (percentage, fixed, one expired for testing).
- Sample customers and a few orders in every status.

## 13. Operations and Quality (OPS)

- OPS-1: Code quality: thin controllers, service/action layer, Laravel Pint, ESLint, Prettier, TypeScript strict mode.
- OPS-2: Tests: feature tests for checkout, stock and oversell race, coupon rules, RBAC matrix, IDOR, login throttling, webhook idempotency.
- OPS-3: Structured logging and a health check endpoint.
- OPS-4: Queue worker and scheduler documented.
- OPS-5: Docker Compose for one-command local run (php, nginx, mysql, mailpit, next) (bonus).
- OPS-6: CI pipeline running lint and tests (bonus).
- OPS-7: Git: meaningful history with Conventional Commits, never a single commit.

## 14. Documentation Deliverables (OPS-DOC)

- README: local setup, environment variables, database setup, seeding, queue/scheduler, running tests, Stripe test cards (success `4242 4242 4242 4242`, decline `4000 0000 0000 9995`, 3DS `4000 0025 0000 3155`), default admin credentials.
- ARCHITECTURE.md: folder structure decisions, how totals and stock are secured, how RBAC is enforced, what to improve with more time, which bonuses were skipped and why.
- DECISIONS.md: every assumption made.
- API docs (Postman or OpenAPI).
- SECURITY.md: result of the security checklist.
- Optional: 5-minute video walkthrough.

## 15. Bonus Items

2FA (TOTP) for staff, feature tests, Docker setup, guest cart merge (required by D5), product reviews and ratings, live deployment, dark mode, activity log, email verification. If a bonus is skipped, explain why in the README.
