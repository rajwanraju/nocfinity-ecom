# Nocfinity

A complete e-commerce application: a Laravel 12 JSON API with a Next.js 16 storefront and admin
panel, MySQL 8, Tailwind + shadcn/ui, and Stripe test-mode payments.

- **Storefront** — catalogue with search, filters and sorting; product detail with gallery and
  related products; guest and customer carts; coupons; two-step Stripe checkout; order history,
  detail and cancellation; registration, login, password reset and change.
- **Admin panel** — dashboard with revenue chart and low-stock alerts; product and image
  management; category tree; order list/detail with guarded status transitions; coupons;
  customers; role/permission matrix; staff management; profile; read-only activity log; dark mode.
- **API** — versioned REST at `/api/v1`, bearer tokens with separate customer/staff abilities,
  permission-based RBAC, server-side pricing, signed Stripe webhooks with idempotency.

## Stack

| Layer | Choice |
|-------|--------|
| Backend | PHP 8.4, Laravel 12, Sanctum, Spatie Permission, Pest 4 / PHPUnit 12, Pint |
| Database | MySQL 8.4 (SQLite in-memory for the test suite) |
| Frontend | Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui, Zod |
| Payments | Stripe PaymentIntents + Elements + signed webhooks |
| Tooling | ESLint, Prettier, Vitest + Testing Library, GitHub Actions |

## Requirements

- PHP **8.4** with `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `curl`, `zip`, `intl`, `gd`,
  `sodium`, `exif`, `bz2` and `gmp`
- Composer 2
- MySQL **8.4** (or use the Docker stack, which includes it)
- Node.js **22+** and npm
- Optional: Stripe CLI for local webhooks, Docker Desktop for the one-command stack

## Local setup

```bash
git clone <repository-url> ecom-nocfinity
cd ecom-nocfinity

# --- backend ---
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Create the database and point .env at it (defaults: ecom_nocfinity on 127.0.0.1:3306)
mysql -u root -e "CREATE DATABASE ecom_nocfinity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# edit DB_DATABASE / DB_USERNAME / DB_PASSWORD in .env if needed

php artisan migrate --seed
php artisan storage:link
php artisan serve --port=8000
```

In separate terminals (the queue sends order emails; the scheduler expires unpaid orders):

```bash
cd backend
php artisan queue:work
php artisan schedule:work
```

```bash
# --- frontend ---
cd frontend
npm ci
cp .env.example .env.local
# API_URL=http://localhost:8000/api/v1
# NEXT_PUBLIC_SITE_URL=http://localhost:3000
npm run dev
```

Open <http://localhost:3000> for the storefront and <http://localhost:3000/admin> for the admin
panel. The API health check is <http://localhost:8000/api/v1/health>; Mailpit (seeded mail) is at
<http://localhost:8025> if you run it locally.

> If port 8000 is unavailable on your machine, serve the API on another port and set
> `API_URL` to match (this workspace uses `127.0.0.1:8001`). The browser never calls the API
> directly, so only the server-side `API_URL` changes.

### Seeded accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@nocfinity.test` | `SuperAdmin123!` |
| Product Manager | `products@nocfinity.test` | `Staff123!Pass` |
| Store Manager | `manager@nocfinity.test` | `Staff123!Pass` |
| Order Manager | `orders@nocfinity.test` | `Staff123!Pass` |
| Support | `support@nocfinity.test` | `Staff123!Pass` |
| Customer | `customer@nocfinity.test` | `Customer123!` |

Seeding creates categories, products with local images, settings, coupons and sample orders, so the
dashboard and storefront are populated on first run.

## Stripe (test mode)

Checkout needs Stripe test keys. Put them in `backend/.env`; only the publishable key goes to the
frontend:

```dotenv
# backend/.env
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# frontend/.env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Forward webhooks locally so orders become `paid`:

```bash
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET and restart the API
```

Without keys the storefront shows its payment setup notice instead of a broken form; the rest of
the app works.

### Test cards

| Card number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0025 0000 3155` | 3-D Secure authentication required |

Use any future expiry date and any CVC. Card data goes directly to Stripe; the API only stores
PaymentIntent ids and status.

## Background jobs

- `php artisan queue:work` — order notifications and other queued work (`QUEUE_CONNECTION=database`).
- `php artisan schedule:work` — runs `orders:expire-pending` hourly, releasing stock and coupons
  for orders that were never paid.
- `php artisan orders:expire-pending` can also be run manually.

## Tests and quality

| Command | What it covers |
|---------|----------------|
| `cd backend && php artisan test` | Full API feature/unit suite (auth, RBAC, catalog, cart, coupons, checkout, webhooks, admin, security) |
| `cd backend && ./vendor/bin/pint --test` | PHP code style |
| `cd frontend && npm test` | Vitest suites for BFF handlers, proxy/CSP, components and formatting helpers |
| `cd frontend && npm run typecheck` | TypeScript strict |
| `cd frontend && npm run lint` | ESLint |
| `cd frontend && npm run format:check` | Prettier |
| `cd frontend && npm run build` | Production Next.js build (also catches route/SSR issues) |

The API tests use SQLite in memory and a fake Stripe gateway, so they need no database or network.
See [`SECURITY.md`](SECURITY.md) for the security-specific suite and dependency audit results.

## Docker Compose (optional one-command stack)

With Docker Desktop installed, MySQL, the API, a queue worker, the scheduler, Mailpit and the
Next.js app start together:

```bash
STRIPE_KEY=pk_test_... STRIPE_SECRET=sk_test_... \
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... \
docker compose up --build
```

- Storefront/admin: <http://localhost:3000> (`admin@nocfinity.test` / `SuperAdmin123!`)
- API: <http://localhost:8000/api/v1>, Mailpit: <http://localhost:8025>
- MySQL from the host: `localhost:3307`

The stack seeds a fresh database on first start (`SEED_DATABASE=false` to skip), keeps MySQL data
and uploaded images in named volumes, and accepts port/DB/Stripe overrides from your shell or a
local `.env`. Full guide, credentials and limitations: [`docs/DOCKER.md`](docs/DOCKER.md).

## Documentation

| Document | Contents |
|----------|----------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, modules, request flows, data model, deployment |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Functional and non-functional requirements |
| [`docs/TASK_BREAKDOWN.md`](docs/TASK_BREAKDOWN.md) | Phase plan and what each phase delivered |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decision log and trade-offs |
| [`docs/ERD.md`](docs/ERD.md) | Entity-relationship diagram |
| [`docs/api/README.md`](docs/api/README.md) | Postman collection (65 requests) and environment |
| [`SECURITY.md`](SECURITY.md) | Security controls, audit evidence, production checklist |
| [`docs/DOCKER.md`](docs/DOCKER.md) | Compose stack, operations and limitations |
| [`PROGRESS.md`](PROGRESS.md) | Phase status, traceability matrix and phase reports |

## Bonuses and scope

Included: activity log, admin dark mode, Docker Compose stack, GitHub Actions CI, seeded demo
catalogue with locally generated images, responsive storefront and admin panel.

Deliberately not implemented: staff TOTP 2FA and customer email verification (both marked bonus
in the requirements and deferred in `docs/DECISIONS.md`), frontend end-to-end browser tests and a
video walkthrough. The accessibility pass is limited to semantics, labels and focus styles — no
formal axe/keyboard audit was run.

## Known limitations

- The Docker stack runs `php artisan serve`, not PHP-FPM/nginx with TLS; it is a local/demo stack.
- Live Stripe card runs and Docker image builds were not executed in this workspace (no keys and no
  Docker installation); everything else is verified by the automated suites and local runs.
- The admin activity log is append-only and unbounded; add a retention policy before production.
- Four moderate npm advisories affect build-time tooling only (`minimatch` via `shadcn`/`ts-morph`);
  production dependencies are clean. Details in `SECURITY.md`.
- Behind a TLS-terminating proxy, configure Laravel trusted proxies so HTTPS detection (and HSTS)
  works; see the production checklist in `SECURITY.md`.
