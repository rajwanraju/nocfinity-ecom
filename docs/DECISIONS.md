# Decisions Log

Every assumption and ruling made while building this project. Newest phases append; earlier entries stay unless superseded.

## Fixed product decisions (from the brief, adopted as-is)

| # | Decision |
|---|----------|
| D1 | Money is stored and transported as integer cents. Currency is USD (`usd`). |
| D2 | Flat shipping fee and a free-shipping threshold are settings in the `settings` table (not env). Tax is a percentage setting, default `0`. |
| D3 | One `users` table with `type` = `customer` \| `staff`, separate customer/staff login endpoints and Sanctum abilities. Staff endpoints reject customer tokens and vice versa. |
| D4 | Sanctum bearer tokens are held only by the Next.js BFF in an httpOnly, Secure-capable, SameSite=Lax cookie. No token is ever sent to client JavaScript or localStorage. |
| D5 | Guest carts are identified by a UUID `cart_token` cookie and merged into the user cart on login. Checkout requires authentication. |
| D6 | No product variants. |
| D7 | Stripe PaymentIntent + signature-verified, idempotent webhook. Only the webhook marks an order paid. |
| D8 | Spatie Laravel Permission with guard-scoped roles; Super Admin bypasses checks with `Gate::before`. |
| D9 | Queue driver `database`; all mail queued; Mailpit locally. |
| D10 | MySQL `LIKE`/FULLTEXT search only. |

## P0 — Setup and tooling

| # | Decision | Why | Cost if wrong |
|---|----------|-----|---------------|
| P0-1 | **No Figma file or link was supplied with the repository.** The storefront will follow the visual language described in the brief (clean editorial commerce layout, desktop 1440px with 390px responsive behaviour), with a documented design-token file. | We cannot invent pixel values from an unavailable file. The alternative — blocking — stops all work. | Visual comparison against the original Figma cannot be exact. Reviewer sees a deliberate, consistent design instead. Replacing tokens later is a contained change in `frontend/src/app/globals.css`. |
| P0-2 | Next.js **16.4** (App Router, React 19, Turbopack) is used. Requirement is "14+", so this satisfies it. | Current `create-next-app` stable; avoids starting on an unsupported version. | Some ecosystem packages may lag. Verified during build in P8. |
| P0-3 | Pest **4** with PHPUnit **12** is used instead of the skeleton's PHPUnit 11. | The task requires Pest; Pest 4 requires PHPUnit 12. | None; test syntax stays Pest-compatible. |
| P0-4 | Response envelope always contains all five keys. `meta` and `errors` are `null` when empty. | FR-API-2 consistency; clients can rely on the shape. | Slightly larger payloads. |
| P0-5 | Destructive DELETE endpoints return **204 with no body**, everything else returns the envelope. | FR-API-3 explicitly allows 204 and it is the correct REST semantic. | Frontend must tolerate empty bodies on delete; handled once in the API client. |
| P0-6 | Laravel is mounted at `/api/v1`; `apiPrefix` is set in `bootstrap/app.php`. `/up` remains the framework liveness probe and `/api/v1/health` is the documented OPS-3 health check (DB + cache). | One canonical base path, two useful probes. | None. |
| P0-7 | Security headers are set in Laravel (`SecurityHeaders` middleware) and in `next.config.ts`. The **CSP** for Next.js is added in P8 as a nonce-based header via middleware, because a static CSP breaks Next's inline bootstrap scripts. | Correct CSP without breaking the app. | CSP is verified in P12, not P0. |
| P0-8 | MySQL 8.4 (Laragon) is the local server. `ecom_nocfinity` database is UTF8MB4. Root/no-password is local-only and never used in `.env.example` defaults beyond localhost placeholders. | Matches required MySQL 8. | None. |
| P0-9 | Local PHP 8.4 required a `php.ini` enabling `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `curl`, `zip`, `intl`, `gd`, `sodium`, `exif`, `bz2`, `gmp`. This is machine setup, not committed. | Laravel/Composer need these extensions. | Documented in README prerequisites in P14. |
| P0-10 | Login throttling is implemented as an explicit `LoginThrottleService`/rate limiter keyed by lowercased email + IP (P2), not only the generic `throttle:login`. | FR-AUTH-5 says 5 failed attempts per email + IP; generic route throttling also counts successes. | Slightly more code; accurate semantics. |
| P0-11 | This workstation refuses `php artisan serve` on ports 8000/8001 but accepts the same Laravel app via `php -S 127.0.0.1:8001 -t public`. Local `.env`/`.env.local` therefore use port 8001; `.env.example` keeps the conventional 8000. | Environmental quirk, not a code decision. Both boot methods were verified. | Reviewer may need to change one port if 8000 is unavailable on their machine. |

## P1 — Database, models, seeders

| # | Decision | Why | Cost if wrong |
|---|----------|-----|---------------|
| P1-1 | **No separate `addresses` table.** The shipping address is a denormalised snapshot on `orders`; the order policy guards access. | SEC-5 lists "addresses", but the required table list does not include an address book, and orders must never change when a saved address is edited. | If saved addresses become a requirement, add a `user_addresses` table later; order snapshots stay unchanged. |
| P1-2 | Coupon `value` is an **integer percentage (1–100)** for `percentage` coupons and **integer cents** for `fixed` coupons. | Avoids float money/percentage drift and keeps one integer column. | Percentages cannot be fractional (e.g. 12.5%). Acceptable for the brief; would become basis points later. |
| P1-3 | Soft deletes on `categories`, `products`, `coupons`; not on `orders`, `payments`, `users`. | Preserve catalogue history while keeping orders immutable and auditable. | A "deleted" product remains referenced by order snapshots. Admin lists must exclude trashed rows by default (P4/P7). |
| P1-4 | Cancelling a paid order **hard-deletes** the `coupon_usages` row and decrements `used_count` inside the same transaction. | Simple, exact restoration of both per-user and total limits. | Usage history for cancelled orders is lost; the order still stores `coupon_code` and discount. |
| P1-5 | Product images are generated locally with GD (`database/seeders/assets/generate-product-images.php`) and committed (~1 MB total). | NFR-SEED requires local images with no external dependency. | Repository is slightly larger. Regeneration is deterministic. |
| P1-6 | The cart stores `unit_price` when an item is added, so FR-CART-6 can flag price changes. Checkout always recalculates from products. | Detecting "price changed" needs the original price; it is never trusted as the charged price. | None; stale values are informational only. |
| P1-7 | Status/type columns are `string` + PHP backed enums, not MySQL `ENUM`. | Portable to SQLite tests, easy to extend, and still strictly cast. | Database-level enum validation is replaced by app validation/tests. |
| P1-8 | Settings keys are dotted (`shipping.flat_fee`, `tax.percent`, …) and typed (`string|integer|boolean|json`), cached through `SettingService`. | One place for every pricing input required by SEC-1. | A stale cache across processes is possible until `SettingService::flush()`; all writes go through the service. |
| P1-9 | Tests keep `BCRYPT_ROUNDS=12` (no test override), and a test asserts the hash cost. | SEC-2 says cost 12; testing the real cost is the evidence. | Slower test suite (~16s). |
| P1-10 | Seed passwords are inserted as plain strings and hashed by the model's `hashed` cast. | Exercises the same path used by the application and proves bcrypt is applied. | None. |
| P1-11 | `order_number_sequences` is a per-year counter; seeding and P6 both increment it under a transaction/lock. | FR-ORDER-9 requires a race-safe sequence. | Sequence gaps after failed transactions are acceptable (numbers need uniqueness, not density). |
| P1-12 | Seed orders do **not** decrement product stock. | The seed represents historical data, and stock values are curated to exercise all stock states. | Stock numbers are illustrative, not a ledger of seeded sales. Documented for reviewers. |

## P2 — Authentication

| # | Decision | Why | Cost if wrong |
|---|----------|-----|---------------|
| P2-1 | Login throttling is an explicit counter in `AuthService` keyed by `strtolower(email)|ip`, checked before credential validation, not route middleware. | FR-AUTH-5 counts *failed* attempts per email + IP; a generic route limiter would also count successes and cannot clear on success. | A distributed deployment needs a shared cache (the database cache is shared here). |
| P2-2 | Throttled responses are `429` with `Retry-After` and the standard envelope. | FR-AUTH-5 requires 429; the envelope keeps clients uniform. | None. |
| P2-3 | The password reset notification is queued (`ShouldQueue`), mirroring D9, and its link points at `FRONTEND_URL/reset-password?token=…&email=…`. | Mail must not block the request, and the frontend owns the reset screen (no Blade). | Local reviewers must run `queue:work` (or `queue:listen`) and Mailpit; documented in README. |
| P2-4 | `Password::uncompromised()` is enabled in every environment except tests (`PASSWORD_CHECK_PWNED=false` in `phpunit.xml`). The pwned path is still tested by one test that enables the rule and fakes the HaveIBeenPwned HTTP response. | The rule calls a public API; keeping it on in every test makes the suite network-dependent. | Tests do not exercise the live API; the faked test proves the rule is wired in. |
| P2-5 | Email verification (FR-AUTH-4) and staff TOTP 2FA (FR-AUTH-9) are **bonus** items and are deferred until all P0–P14 core work is complete. | They add flows (signed URLs, QR enrolment, recovery codes) that are not part of the core commerce journey. | The bonus points for those two items are not claimed unless time allows in P14. |
| P2-6 | Inactive users get the same generic `401` as a wrong password, and staff tokens are ability-scoped at the route level. | FR-AUTH-6 forbids enumeration; D3 requires separated surfaces. | Operators cannot distinguish a disabled account from bad credentials in the response — intentional; admins see `is_active` in the admin UI. |
| P2-7 | Sanctum caches the resolved guard user for the lifetime of a test; tests call `forgetAuthGuards()` after switching tokens. | Without it, sequential requests with different bearer tokens within one Pest test reuse the first user. | Test-only helper; real HTTP requests are unaffected. |

## P3 — RBAC

| # | Decision | Why | Cost if wrong |
|---|----------|-----|---------------|
| P3-1 | `Gate::before` short-circuits only **namespaced** permission abilities (those containing `.`), not bare policy abilities (`view`, `update`, `delete`). | FR-RBAC-4 gives Super Admin every permission but still forbids editing/deleting Super Admin accounts. A blanket bypass would defeat `StaffPolicy`. | Any future Gate ability intended for Super Admin must use the `domain.action` naming convention. Documented here and in `AppServiceProvider`. |
| P3-2 | `App\Models\Role` overrides Spatie's `users()` relation with an explicit `User` target. | After `auth:sanctum` authenticates, `auth.defaults.guard` becomes `sanctum`; Spatie's relation then looks for a provider-less guard and passes `null` to `morphedByMany`, breaking `withCount`/`loadCount` (500 on role list). | Role-model overrides must be kept in sync with Spatie upgrades. |
| P3-3 | Admin holds `staff.manage` but **not** `roles.manage`; only Super Admin sees the roles/permission matrix. Staff management by an Admin cannot grant the Super Admin role. | FR-RBAC-7 says the roles page is Super Admin only; staff operations are a normal admin duty. The escalation guard closes the obvious hole. | An Admin cannot create roles; a Super Admin must. |
| P3-4 | `DELETE /admin/staff/{id}` deactivates the account (and revokes tokens) instead of deleting the row. | Orders, status histories and activity logs reference the user; removing the row would corrupt the audit trail. | The API returns 204 like a delete, but the record persists. "Deleted" staff remain visible in filtered inactive lists. |
| P3-5 | Super Admin accounts are immutable through the staff API and staff cannot modify themselves. Combined with the immutable Super Admin role, this guarantees the last Super Admin can never be removed. | FR-RBAC-4 is an availability requirement: locking every admin out is worse than refusing a legitimate edit. | Renaming or resetting a Super Admin must be done directly in the database/console. There is always at least one working Super Admin. |
| P3-6 | Deleting a role still assigned to staff returns `409 Conflict`; the Super Admin role always returns `403`. | Deleting an in-use role would silently strip permissions; Spatie would detach users. The system role is not user-owned. | Admins must reassign staff before deleting a role. |
| P3-7 | `PermissionRegistry` (not the database) is the source of truth for permission names, labels and groups; the matrix API returns groups and roles in one response. | FR-RBAC-2/7 need a stable, ordered matrix; the seeder and UI both read the same list. | Adding a permission requires one registry entry plus a re-seed. |

## P4 — Catalog

| # | Decision | Why | Cost if wrong |
|---|----------|-----|---------------|
| P4-1 | Product descriptions are sanitized on write with **HTMLPurifier** (`ezyang/htmlpurifier`) using a small tag allowlist; no scripts, event handlers or `javascript:`/`data:` URLs. | SEC-4/FR-CAT-2; a hand-rolled regex sanitizer is not trustworthy. | One extra production dependency. Changing the allowlist requires re-saving old rows. |
| P4-2 | The effective price is the discount only when `discount_price < price`; both the model (`currentPrice`) and SQL (`CASE …`) apply that guard. | Protects sorting/filters from invalid legacy/imported rows, and keeps PHP and SQL ordering identical. | A malformed discount silently falls back to the regular price instead of showing a higher "sale" price. |
| P4-3 | Public product queries require `is_active` **and** an active non-deleted category; the category filter resolves the whole subtree in PHP from one category query. | FR-CAT-5 hides inactive products; the tree is small (3 levels) so one query plus in-memory traversal beats recursive SQL. | A very large category tree would need a materialized path/recursive CTE. |
| P4-4 | Deleting a category returns `409` when any child or product (including soft-deleted) still references it. | The FK would otherwise fail with a 500, and soft-deleted products still hold the reference. | Admins must move/delete products first. |
| P4-5 | Admin catalog routes bind by explicit `:id`; public product/category routes bind by slug. | Admin URLs stay stable while editors rename slugs; public URLs stay SEO-friendly. | Two binding conventions to remember. |
| P4-6 | Deleting a product soft-deletes the row but hard-deletes its image rows and files. | FR-CAT-6 requires file cleanup; the product snapshot in order items is independent. | Restoring a soft-deleted product does not restore its images; they must be re-uploaded. |
| P4-7 | Uploaded images use Laravel's hashed `store()` filename; the first image becomes primary automatically and deleting the primary promotes the next by `sort_order`. | FR-CAT-6 random names; the UI always has a primary image without a second request. | None. |
| P4-8 | Slugs are generated from the name when omitted, with `-2`, `-3` suffixes checked across soft-deleted rows; an explicit slug is honoured and validated as unique. | Avoids 500s from the unique index and keeps public URLs stable. | Renaming without an explicit slug changes the product URL (documented admin behaviour). |



