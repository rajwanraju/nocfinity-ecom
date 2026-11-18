# Progress

Last updated: P0.

## Phase status

| Phase | Title | Status | Commit range |
|-------|-------|--------|--------------|
| P0 | Project setup and tooling | ✅ Done | see `git log --oneline` |
| P1 | Database, models, seeders | ⬜ Not started | — |
| P2 | Authentication | ⬜ Not started | — |
| P3 | RBAC | ⬜ Not started | — |
| P4 | Catalog API | ⬜ Not started | — |
| P5 | Cart and coupons | ⬜ Not started | — |
| P6 | Checkout, payment, orders | ⬜ Not started | — |
| P7 | Admin API | ⬜ Not started | — |
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
| FR-AUTH-1 | Customer register/login/logout/me | — | — | ⬜ |
| FR-AUTH-2 | Separate staff auth, token abilities | — | — | ⬜ |
| FR-AUTH-3 | Forgot/reset password, 60 min, single use | — | — | ⬜ |
| FR-AUTH-4 | Email verification (bonus) | — | — | ⬜ |
| FR-AUTH-5 | Login throttle 5 attempts + 429 + Retry-After | — | — | ⬜ |
| FR-AUTH-6 | Generic login error, no email enumeration | — | — | ⬜ |
| FR-AUTH-7 | Password policy (10+, mixed, number, symbol, pwned) | — | — | ⬜ |
| FR-AUTH-8 | Token revocation + expiry | — | — | ⬜ |
| FR-AUTH-9 | TOTP 2FA for staff (bonus) | — | — | ⬜ |
| FR-RBAC-1 | Five roles + custom | — | — | ⬜ |
| FR-RBAC-2 | Granular permission list | — | — | ⬜ |
| FR-RBAC-3 | Roles↔permissions, staff↔roles | — | — | ⬜ |
| FR-RBAC-4 | Super Admin immutability, last one protected | — | — | ⬜ |
| FR-RBAC-5 | Permission middleware on every admin route | — | — | ⬜ |
| FR-RBAC-6 | `/admin/auth/me` effective permissions | — | — | ⬜ |
| FR-RBAC-7 | Permission matrix API/UI | — | — | ⬜ |
| FR-RBAC-8 | Staff management | — | — | ⬜ |
| FR-CAT-1 | Category tree, slug, delete guards | — | — | ⬜ |
| FR-CAT-2 | Product fields, images, soft delete | — | — | ⬜ |
| FR-CAT-3 | Search, category, price, sort, pagination | — | — | ⬜ |
| FR-CAT-4 | Product detail, stock status, related | — | — | ⬜ |
| FR-CAT-5 | Inactive products hidden | — | — | ⬜ |
| FR-CAT-6 | Image validation, random names, cleanup | — | — | ⬜ |
| FR-CART-1 | DB carts for users, token carts for guests | — | — | ⬜ |
| FR-CART-2 | Add/update/remove/clear, qty caps | — | — | ⬜ |
| FR-CART-3 | Out-of-stock add rejected (422) | — | — | ⬜ |
| FR-CART-4 | Server-calculated totals | — | — | ⬜ |
| FR-CART-5 | Guest merge on login | — | — | ⬜ |
| FR-CART-6 | Cart warnings (inactive/price/stock) | — | — | ⬜ |
| FR-COUPON-1 | Coupon fields and case-insensitive code | — | — | ⬜ |
| FR-COUPON-2 | Validation on apply/checkout/payment | — | — | ⬜ |
| FR-COUPON-3 | Usage increment on paid, decrement on cancel | — | — | ⬜ |
| FR-ORDER-1 | Address validation | — | — | ⬜ |
| FR-ORDER-2 | Server recalculation, minimal client input | — | — | ⬜ |
| FR-ORDER-3 | Pending order + PaymentIntent + idempotency | — | — | ⬜ |
| FR-ORDER-4 | Stripe Elements card only | — | — | ⬜ |
| FR-ORDER-5 | Verified webhook marks paid + side effects | — | — | ⬜ |
| FR-ORDER-6 | Failure never marks paid/decrements stock | — | — | ⬜ |
| FR-ORDER-7 | Webhook signature + idempotency | — | — | ⬜ |
| FR-ORDER-8 | Oversell prevention + auto refund | — | — | ⬜ |
| FR-ORDER-9 | Race-safe `ORD-YYYY-NNNNNN` | — | — | ⬜ |
| FR-ORDER-10 | Item snapshots | — | — | ⬜ |
| FR-ORDER-11 | Transition table + history + email | — | — | ⬜ |
| FR-ORDER-12 | Cancel paid: refund, stock, coupon restore | — | — | ⬜ |
| FR-ORDER-13 | Customer order list/detail, IDOR 404 | — | — | ⬜ |
| FR-ORDER-14 | Expire stale pending orders | — | — | ⬜ |
| FR-ADMIN-1 | Dashboard stats + 30-day chart + recent orders | — | — | ⬜ |
| FR-ADMIN-2 | Product admin list/create/edit | — | — | ⬜ |
| FR-ADMIN-3 | Category tree CRUD | — | — | ⬜ |
| FR-ADMIN-4 | Orders list/detail/status actions | — | — | ⬜ |
| FR-ADMIN-5 | Coupons CRUD | — | — | ⬜ |
| FR-ADMIN-6 | Customers list/detail + order history | — | — | ⬜ |
| FR-ADMIN-7 | Roles matrix + staff management | — | — | ⬜ |
| FR-ADMIN-8 | Profile + change password | — | — | ⬜ |
| FR-ADMIN-9 | Responsive admin UI, states, toasts, dialogs | — | — | ⬜ |
| FR-ADMIN-10 | Dark mode + activity log (bonus) | — | — | ⬜ |
| FR-UI-1 | All storefront pages | — | — | ⬜ |
| FR-UI-2 | Matches Figma 1440/390 | — | — | ⬜ |
| FR-UI-3 | Consistent visual language on undesigned screens | — | — | ⬜ |
| FR-UI-4 | SEO + SSR product pages | — | — | ⬜ |
| FR-UI-5 | Accessibility | — | — | ⬜ |
| FR-UI-6 | Skeletons, error boundaries, empty states | — | — | ⬜ |
| FR-API-1 | `/api/v1` REST | `backend/bootstrap/app.php` | `tests/Feature/HealthTest.php` | 🟡 |
| FR-API-2 | Response envelope | `backend/app/Support/ApiResponse.php` | `tests/Feature/HealthTest.php` | 🟡 |
| FR-API-3 | Correct status codes | `backend/app/Exceptions/ApiExceptionHandler.php` | `tests/Feature/HealthTest.php` (404) | 🟡 |
| FR-API-4 | Pagination metadata | — | — | ⬜ |
| FR-API-5 | Resources, FormRequests, central handler | `backend/app/Exceptions/ApiExceptionHandler.php` | Pint + tests | 🟡 |
| FR-API-6 | API documentation | — | — | ⬜ |
| SEC-1 | Server-side pricing | — | — | ⬜ |
| SEC-2 | bcrypt cost 12 | `backend/.env.example` (`BCRYPT_ROUNDS=12`) | — | 🟡 |
| SEC-3 | No unsafe SQL | — | — | ⬜ |
| SEC-4 | XSS sanitization | — | — | ⬜ |
| SEC-5 | IDOR policies | — | — | ⬜ |
| SEC-6 | Mass assignment protection | — | — | ⬜ |
| SEC-7 | No sensitive fields in responses | — | — | ⬜ |
| SEC-8 | CORS allowlist + security headers | `backend/config/cors.php`, `SecurityHeaders.php`, `frontend/next.config.ts` | `tests/Feature/HealthTest.php` | 🟡 |
| SEC-9 | CSRF posture (SameSite + origin checks) | — | — | ⬜ |
| SEC-10 | Rate limits | `backend/app/Providers/AppServiceProvider.php` | — | 🟡 |
| SEC-11 | Secure uploads/secrets | `.env.example`, `.gitignore` | review | 🟡 |
| SEC-12 | Stripe signature verification | — | — | ⬜ |
| SEC-13 | Dependency audits | — | — | ⬜ |
| SEC-14 | Validation both sides | — | — | ⬜ |
| NFR-DB-1 | FKs and unique constraints | — | — | ⬜ |
| NFR-DB-2 | Indexes and soft deletes | — | — | ⬜ |
| NFR-DB-3 | Eager loading | — | — | ⬜ |
| NFR-DB-4 | `migrate:fresh --seed` | — | — | ⬜ |
| NFR-SEED | Required seed data | — | — | ⬜ |
| OPS-1 | Thin controllers, services, Pint/ESLint/Prettier/TS strict | Pint, ESLint, Prettier, `tsconfig` strict configured | `pint --test`, `eslint .`, `tsc --noEmit` all clean | 🟡 |
| OPS-2 | Required feature tests | — | — | ⬜ |
| OPS-3 | Logging + health check | `HealthController` | `tests/Feature/HealthTest.php` | 🟡 |
| OPS-4 | Queue + scheduler docs | — | — | ⬜ |
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
