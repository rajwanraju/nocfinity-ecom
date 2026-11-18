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

## P1 — Database and seeders

(entries appended when the phase starts)
