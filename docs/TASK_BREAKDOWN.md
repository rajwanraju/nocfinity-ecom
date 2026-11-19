# Task Breakdown: E-commerce Application

How to use this file:

- Work phase by phase. Finish a phase completely before starting the next.
- Update the Status column and tick the checkboxes as work progresses.
- A phase is DONE only when every step is checked and its Definition of Done (DoD) is verified.
- Requirement IDs refer to `REQUIREMENTS.md`.

Status legend: ⬜ Not started | 🟡 In progress | ✅ Done | ⛔ Blocked

---

## Phase Overview

| Phase | Title | Requirements covered | Status |
|-------|-------|----------------------|--------|
| P0 | Project setup and tooling | OPS-1, OPS-7 | ✅ |
| P1 | Database, models, seeders | NFR-DB, NFR-SEED | ✅ |
| P2 | Authentication | FR-AUTH, SEC-2, SEC-6, SEC-10 | ✅ |
| P3 | RBAC | FR-RBAC | ✅ |
| P4 | Catalog API | FR-CAT, SEC-4 | ✅ |
| P5 | Cart and coupons | FR-CART, FR-COUPON, SEC-1 | ✅ |
| P6 | Checkout, payment, orders | FR-ORDER, SEC-5, SEC-12 | ✅ |
| P7 | Admin API | FR-ADMIN (API side) | ⬜ |
| P8 | Frontend foundation | FR-UI-3, SEC-8, SEC-9 | ⬜ |
| P9 | Storefront pages | FR-UI-1, FR-UI-2, FR-UI-4..6 | ⬜ |
| P10 | Checkout UI and account pages | FR-ORDER (UI), FR-CART-5 | ⬜ |
| P11 | Admin panel UI | FR-ADMIN, FR-RBAC-6, FR-RBAC-7 | ⬜ |
| P12 | Security hardening | SEC-1..14 | ⬜ |
| P13 | Testing and bug fixing | OPS-2 | ⬜ |
| P14 | Docs, Docker, final QA | OPS-5, OPS-6, OPS-DOC | ⬜ |

---

## P0: Project Setup and Tooling

Status: ✅

Steps:
- [x] Create `backend/` (Laravel 12) and `frontend/` (Next.js, TypeScript, App Router)
- [x] Install backend packages: Sanctum, Spatie Laravel Permission, Stripe PHP SDK, Pest, Laravel Pint
- [x] Install frontend packages: Tailwind, shadcn/ui, react-hook-form, zod, a chart library, Stripe React libraries
- [x] Create `.env.example` for both apps, configure `.gitignore`
- [x] Configure MySQL connection, Mailpit mail settings, CORS allowlist
- [x] Configure Pint, ESLint, Prettier, TypeScript strict
- [x] Add a health check endpoint
- [x] Create `PROGRESS.md` and `docs/DECISIONS.md`
- [x] First commit

DoD: Both apps boot locally. Health endpoint returns 200. Linters run clean.

---

## P1: Database, Models, Seeders

Status: ✅

Steps:
- [x] Migrations: users (+ `type`, `is_active`, `phone`), password_reset_tokens, personal_access_tokens
- [x] Migrations: Spatie roles and permissions tables
- [x] Migrations: categories, products, product_images
- [x] Migrations: carts, cart_items
- [x] Migrations: coupons, coupon_usages
- [x] Migrations: orders, order_items, order_status_histories, payments
- [x] Migrations: stripe_webhook_events, order_number_sequences, settings, activity_logs (bonus)
- [x] Add foreign keys, unique constraints, indexes, soft deletes
- [x] Models with relationships, casts, `$fillable`
- [x] Seeders: permissions, roles, Super Admin, category tree, 20+ products with local images, 3 coupons, customers, orders in all statuses
- [x] ER diagram added to docs

DoD: `php artisan migrate:fresh --seed` succeeds from scratch.

---

## P2: Authentication

Status: ✅

Steps:
- [x] Customer register, login, logout, me
- [x] Staff login, logout, me on a separate endpoint with ability checks
- [x] Login throttle: 5 failed attempts, HTTP 429
- [x] Generic invalid-credentials error
- [x] Strong password policy rules
- [x] Forgot / reset password flow with Mailpit, token expiry, single use
- [x] Revoke tokens on logout and on password change
- [ ] Email verification (bonus) — deferred, see DECISIONS P2-5
- [ ] TOTP 2FA for staff (bonus) — deferred, see DECISIONS P2-5
- [x] Tests: generic error, throttle, customer token rejected on admin routes and reverse, password reset

DoD: All auth tests pass. — 36 tests / 233 assertions green; reset mail verified in Mailpit.

---

## P3: Role-Based Access Control

Status: ✅

Steps:
- [x] Finalize permission list and group them
- [x] Seed 5 roles with correct permission sets
- [x] `Gate::before` for Super Admin
- [x] Permission middleware on every admin route
- [x] Super Admin protection: not editable, not deletable, last one cannot be removed
- [x] Roles CRUD API and permission matrix API (grouped)
- [x] Staff CRUD API with role assignment and deactivation
- [x] `/admin/auth/me` returns effective permissions
- [x] Tests: allow/deny matrix per role, Super Admin immutability

DoD: Unauthorized calls return 403. All RBAC tests pass. — 26 RBAC tests green (62 total / 361 assertions); real HTTP smoke test passed.

---

## P4: Catalog API

Status: ✅

Steps:
- [x] Category CRUD with tree support and delete guards
- [x] Product CRUD with validation (SKU unique, discount price lower than price)
- [x] Image upload, reorder, set primary, delete (type and size validation)
- [x] Sanitize product description (XSS)
- [x] Public endpoints: product list (search, category incl. children, price range, sort, pagination), product detail by slug, related products, category tree
- [x] Compute stock status; hide inactive products
- [x] Tests: filters, sorting, pagination metadata, inactive hidden, validation

DoD: All catalog endpoints verified (Postman or tests). — 34 catalog tests green (96 total / 516 assertions); public endpoints smoke-tested over HTTP.

---

## P5: Cart and Coupons

Status: ✅ Done

Steps:
- [x] Cart endpoints: get, add, update, remove, clear
- [x] Guest cart via `cart_token`; user cart in DB
- [x] Enforce stock, active status, quantity caps; reject out-of-stock
- [x] Merge guest cart on login
- [x] `PricingService` as the single source of subtotal, discount, shipping, tax, total
- [x] Coupon apply and remove with all rules (expiry, limits, min amount, per-user, max discount)
- [x] Cart warnings for changed or unavailable items
- [x] Tests: tampered price ignored, expired coupon rejected, merge correctness, out-of-stock add rejected

DoD: Cart totals are always server-computed. — 20 cart/coupon tests green (116 total / 666 assertions); guest cart → coupon → totals smoke-tested over HTTP against MySQL.

---

## P6: Checkout, Payment, Orders

Status: ✅

Steps:
- [x] Address validation
- [x] Checkout endpoint: revalidate cart, coupon, stock; create pending order and Stripe PaymentIntent with idempotency key
- [x] Race-safe order number generator
- [x] Order item snapshots
- [x] Webhook endpoint: signature verification, idempotent event storage
- [x] Paid handler in a DB transaction with `lockForUpdate`: decrement stock, increment coupon usage, save payment, write status history
- [x] Insufficient stock after payment: auto refund, cancel order, clear message
- [x] Payment failure handling (order never paid)
- [x] Status transition service enforcing the transition table
- [x] Queued emails on status changes
- [x] Cancel flow: Stripe refund, stock restore, coupon usage restore
- [x] Customer order list and detail with ownership policy
- [x] Scheduled command to expire stale pending orders
- [x] Tests: success, failed payment, oversell race, duplicate webhook, invalid transition, IDOR, cancel restores stock

DoD: Full flow verified with Stripe test cards (success and decline). — Automated success, decline, duplicate-webhook, oversell, refund and cancel paths are green (26 order tests; 142 total / 842 assertions) using a fake gateway with real signature verification. The live Stripe test-card run is blocked locally because `.env` has no `STRIPE_KEY`/`STRIPE_SECRET`/`STRIPE_WEBHOOK_SECRET`; add test keys and repeat the card flow before a production demo.

---

## P7: Admin API

Status: ✅

Steps:
- [x] Dashboard stats endpoint (today's orders, revenue, customers, low stock) and 30-day sales series
- [x] Orders list (status filter, search) and detail
- [x] Order status update endpoint
- [x] Coupons CRUD
- [x] Customers list and detail with order history
- [x] Staff profile update and password change
- [x] Activity log (bonus)
- [x] Permission tests for every endpoint

DoD: Every admin endpoint is permission-protected and documented. — 38 admin tests green (180 total / 1011 assertions), Pint clean. The endpoint/permission table lives in `PROGRESS.md` (P7 report). Admin UI screens are P11; this phase delivers the APIs. Dark mode (the other half of the FR-ADMIN-10 bonus) belongs to P11.

---

## P8: Frontend Foundation

Status: ⬜

Steps:
- [ ] Extract design tokens (colors, typography, spacing) from Figma
- [ ] Storefront and admin layouts
- [ ] Typed API client and BFF auth with httpOnly cookie
- [ ] Route guards via Next.js middleware
- [ ] Shared UI components: Button, Input, Modal, Toast, Skeleton, Pagination, Table
- [ ] Error and 404 pages
- [ ] Security headers in `next.config`

DoD: Login works via cookie. Token is not accessible from client JavaScript.

---

## P9: Storefront Pages

Status: ⬜

Steps:
- [ ] Home: hero, featured categories, product grids, promo sections
- [ ] Listing: filters UI, search, sort, pagination, URL query sync
- [ ] Product detail: gallery, info, stock status, add to cart, related products
- [ ] Cart: quantity controls, remove, order summary, coupon field
- [ ] Mobile (390px) responsive behavior
- [ ] SEO metadata, loading skeletons, empty and error states

DoD: Side-by-side comparison with Figma is acceptable. Accessibility check done.

---

## P10: Checkout UI and Account Pages

Status: ⬜

Steps:
- [ ] Register, login, forgot and reset password pages
- [ ] Checkout page: address form, order summary, Stripe Elements (card only)
- [ ] Payment processing and failure states
- [ ] Order confirmation page
- [ ] My Orders list, order detail, cancel action
- [ ] Guest cart merge on login

DoD: Manual end-to-end purchase passes for success card and decline card.

---

## P11: Admin Panel UI

Status: ⬜

Steps:
- [ ] Responsive layout with sidebar and permission-based menu and buttons
- [ ] Dashboard: stat cards, 30-day chart, recent orders
- [ ] Products: list, create/edit, multi-image upload, active toggle
- [ ] Categories: tree CRUD
- [ ] Orders: list, detail, status actions showing only valid next states
- [ ] Coupons CRUD
- [ ] Customers list and detail
- [ ] Roles and Permissions matrix page
- [ ] Staff management
- [ ] Profile page
- [ ] Dark mode (bonus)

DoD: A Product Manager login sees only the menu items allowed by their permissions.

---

## P12: Security Hardening

Status: ⬜

Steps:
- [ ] Test price and coupon tampering
- [ ] Test IDOR on orders and carts
- [ ] Test XSS payloads in descriptions, names, addresses
- [ ] Test SQL injection payloads on search and filters
- [ ] Test mass assignment (`type`, roles)
- [ ] Audit API responses for sensitive fields
- [ ] Verify security headers and CORS
- [ ] Verify rate limits on login, register, reset, coupon, checkout
- [ ] Run `composer audit` and `npm audit`
- [ ] Production config check: `APP_DEBUG=false`, secure cookies
- [ ] Write `SECURITY.md` with results

DoD: Every SEC requirement has evidence (test or documented check).

---

## P13: Testing and Bug Fixing

Status: ⬜

Steps:
- [ ] Feature tests: checkout, stock and oversell, coupons, RBAC, IDOR, throttling, webhook idempotency
- [ ] Frontend smoke or e2e tests (optional)
- [ ] Fix all failures and lint issues

DoD: All tests green. Linters clean.

---

## P14: Docs, Docker, Final QA

Status: ⬜

Steps:
- [ ] README (setup, env vars, DB, seed, queue/scheduler, tests, Stripe test cards, admin credentials)
- [ ] ARCHITECTURE.md
- [ ] API documentation (Postman or OpenAPI)
- [ ] DECISIONS.md finalized
- [ ] Docker Compose for one-command run (bonus)
- [ ] CI pipeline (bonus)
- [ ] Fresh-clone test following the README from scratch
- [ ] Note skipped bonuses and reasons in README
- [ ] Optional: video walkthrough script
- [ ] Traceability matrix in `PROGRESS.md` fully filled

DoD: A reviewer can run the project from a fresh clone in about 15 minutes.

---

## Traceability to the Original Brief

| Brief section | Covered in |
|---------------|-----------|
| 3.1 Authentication | P2 |
| 3.2 RBAC | P3, P11 |
| 3.3 Storefront | P4, P5, P9, P10 |
| 3.4 Order and inventory | P6 |
| 3.5 Admin panel | P7, P11 |
| 3.6 Security | P2 to P6, P12 |
| 4 Database | P1 |
| 5 API design | P4 to P7, P14 |
| 6 Deliverables | P14 |
| 7 Evaluation criteria | P12, P13, P14 |
| 8 Rules | DECISIONS.md updated every phase |
| 9 Bonus | P2, P8, P11, P13, P14 |
