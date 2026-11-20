#!/bin/sh
# Container entrypoint shared by the API, queue worker and scheduler.
#
# Configuration comes from Compose environment variables, so no .env file is
# written into the image (and a host .env is never copied in). Migrations and
# seeding only run for the `backend` service; the queue and scheduler set
# RUN_MIGRATIONS=false so they never race the API on startup.

set -eu

cd /var/www/html

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Waiting for MySQL at ${DB_HOST:-mysql}:${DB_PORT:-3306}..."

  tries=0

  until php -r '
    try {
      $dsn = sprintf(
        "mysql:host=%s;port=%s;dbname=%s",
        getenv("DB_HOST"),
        getenv("DB_PORT") ?: "3306",
        getenv("DB_DATABASE")
      );
      new PDO($dsn, getenv("DB_USERNAME"), getenv("DB_PASSWORD"), [PDO::ATTR_TIMEOUT => 2]);
    } catch (Throwable $e) {
      exit(1);
    }
  '; do
    tries=$((tries + 1))

    if [ "$tries" -ge 60 ]; then
      echo "MySQL did not become reachable in time." >&2
      exit 1
    fi

    sleep 2
  done

  php artisan migrate --force

  if [ "${SEED_DATABASE:-false}" = "true" ]; then
    # Seed only a fresh database: re-seeding on every restart would overwrite
    # stock and catalogue edits made through the admin panel.
    users=$(php -r '
      require "vendor/autoload.php";
      $app = require "bootstrap/app.php";
      $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
      echo App\Models\User::count();
    ')

    if [ "$users" = "0" ]; then
      php artisan db:seed --force
    else
      echo "Database already seeded (${users} users); skipping seed."
    fi
  fi
fi

exec "$@"
