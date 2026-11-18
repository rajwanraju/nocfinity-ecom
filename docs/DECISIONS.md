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
