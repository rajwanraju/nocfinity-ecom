# Docker Compose (local demo)

`docker-compose.yml` runs the whole application — MySQL 8.4, the Laravel API, a
queue worker, the scheduler, Mailpit and the Next.js app — with one command. It
is a **local/demo** stack, not a production deployment.

## Prerequisites

- Docker Desktop (or Docker Engine with the Compose plugin)
- ~4 GB of free RAM for the images and MySQL
- Network access for the first build (`composer install`, `npm ci`, and
  `next/font` downloading Geist at build time)

## Start

```bash
docker compose up --build
```

The first run builds both images, waits for MySQL, migrates, and seeds the demo
data. Later starts reuse the images and the `mysql_data` / `backend_storage`
volumes.

| Service | URL |
|---------|-----|
| Storefront | http://localhost:3000 |
| Admin panel | http://localhost:3000/admin/login |
| API | http://localhost:8000/api/v1 |
| Health check | http://localhost:8000/api/v1/health |
| Mailpit | http://localhost:8025 |
| MySQL (host) | `localhost:3307` |

Seeded accounts (from `UserSeeder`):

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@nocfinity.test` | `SuperAdmin123!` |
| Admin | `manager@nocfinity.test` | `Staff123!Pass` |
| Product Manager | `products@nocfinity.test` | `Staff123!Pass` |
| Order Manager | `orders@nocfinity.test` | `Staff123!Pass` |
| Support | `support@nocfinity.test` | `Staff123!Pass` |
| Customer | `customer@nocfinity.test` | `Customer123!` |

## Configuration

Compose reads overrides from your shell or a `.env` file beside
`docker-compose.yml` (never committed):

```bash
# Ports (a rebuild is needed after changing APP_PORT or WEB_PORT)
APP_PORT=8000
WEB_PORT=3000
MYSQL_PORT=3307
MAILPIT_UI_PORT=8025

# First start only: skip or force seeding a fresh database
SEED_DATABASE=true

# Stripe test mode — the publishable key is baked into the frontend at build time
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

- Passing the Stripe variables through your shell keeps secret keys out of the
  repository: `STRIPE_SECRET=sk_test_... docker compose up --build`.
- For webhooks, forward Stripe CLI events to the published API port:
  `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`, then put
  the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart the backend.
  Without Stripe keys the checkout step shows its setup notice; the rest of the
  application is unaffected.

## Operations

```bash
docker compose logs -f backend          # API logs (stderr)
docker compose exec backend php artisan migrate
docker compose exec backend php artisan route:list
docker compose exec backend php artisan tinker
docker compose exec mysql mysql -unocfinity -psecret nocfinity
docker compose down                     # stop, keep data
docker compose down -v                  # stop and delete MySQL + uploads
```

Seeding runs only when the database has no users, so admin edits to stock and
the catalogue are not overwritten on restart.

## How it is wired

- `backend/` builds a PHP 8.4 CLI image, installs production Composer
  dependencies, runs `php artisan serve` on port 8000 as `www-data`, and mounts
  a named volume at `storage/app/public` so product images survive restarts.
- `queue` and `scheduler` reuse the same image with a different command and
  `RUN_MIGRATIONS=false`, so only the API container migrates.
- `frontend/` builds Next.js with `npm run build` and runs `next start`.
  `API_URL` is `http://backend:8000/api/v1` inside the network, while
  `API_PUBLIC_ORIGIN=http://localhost:8000` keeps the CSP pointed at the URL the
  browser uses for images.
- `NEXT_IMAGE_UNOPTIMIZED=true` is set for Compose because the Next image
  optimizer cannot resolve the host-published API from inside its container.

## Limitations

- `php artisan serve` is single-process PHP; it is fine for a demo but not for
  production. A production image should use PHP-FPM behind nginx and a real
  web server, and should not run migrations on every boot.
- The fixed `APP_KEY` and passwords in `docker-compose.yml` are development
  values. Replace them before exposing the stack to anyone else.
- Images are served unoptimized in this stack (no `next/image` resizing).
- The stack was authored but not executed on the development machine used for
  P11 because Docker is not installed there; the frontend/config changes are
  covered by typecheck/lint/tests/build, while `docker compose config`/`up`
  still needs a machine with Docker.
