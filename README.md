# Nocfinity — Production-Grade E-commerce

Laravel 12 JSON API + Next.js (App Router, TypeScript) storefront and admin panel, MySQL 8, Tailwind + shadcn/ui, Stripe test mode.

Full setup instructions are finalised in P14. Until then:

```bash
# backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve

# frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

- API base: `http://localhost:8000/api/v1`
- Health: `GET /api/v1/health`
- Storefront/admin: `http://localhost:3000`
- Mailpit UI: `http://localhost:8025`
