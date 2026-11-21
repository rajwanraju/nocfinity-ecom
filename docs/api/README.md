# Nocfinity API — Postman

Ready-to-run Postman collection covering **all 65 API routes** implemented in P0–P7.

| File | Purpose |
| --- | --- |
| `Nocfinity.postman_collection.json` | 14 folders, 65 requests, auth token and id chaining |
| `Nocfinity.local.postman_environment.json` | Local base URL, demo credentials, Stripe webhook secret placeholder |

## Import

1. Start the API from the repository root:

   ```powershell
   cd backend
   php artisan serve --no-reload
   ```

2. Start the storefront separately if you need CORS/BFF checks:

   ```powershell
   cd frontend
   npm run dev
   ```

3. In Postman: **Import** → select both JSON files.
4. Select the **Nocfinity Local** environment (top-right).
5. Run **00 · Health → Health check**. `data.status` must be `ok`.

## Suggested run order

1. **01 · Customer Auth → Login** — saves `customerToken`.
2. **02 · Staff Auth → Login** — saves `staffToken`.
3. **03 · Catalog → List categories** and **List products** — saves `categoryId`, `productId`, `productSlug`.
4. **04 · Cart** — `Add item` saves `cartToken` and `cartItemId`; then update, coupon, remove.
5. **05 · Checkout & Orders** — requires real Stripe test keys in `backend/.env`.
6. **06–12 Admin** — every request needs `staffToken` plus the permission named in its description.

Tokens and ids are written to **collection variables** by test scripts, so requests can be run in any order after the seed requests.

## Variables

| Variable | Default | Notes |
| --- | --- | --- |
| `baseUrl` | `http://127.0.0.1:8001/api/v1` | Change to the deployed API URL |
| `customerEmail` / `customerPassword` | seeded customer | `customer@nocfinity.test` / `Customer123!` |
| `staffEmail` / `staffPassword` | seeded super admin | `admin@nocfinity.test` / `SuperAdmin123!` |
| `customerToken` / `staffToken` | empty | Auto-saved by login/register |
| `cartToken` | empty | Auto-saved from `meta.cart_token` |
| `productId`, `categoryId`, `orderId`, … | seeded ids | Auto-saved by list/create requests |
| `stripeWebhookSecret` | `whsec_replace_me` | Must match `STRIPE_WEBHOOK_SECRET` in `backend/.env` |

## Conventions

- Money is **integer cents** (USD).
- Success envelope: `{ success, message, data, meta, errors }`.
- `204` responses carry no body; the collection-level test handles them.
- Pagination lives in `meta.pagination` (`current_page`, `per_page`, `total`, `last_page`).
- Admin routes reject customer tokens; customer routes reject staff tokens.
- Destructive requests reuse the same id variables. Point them at **disposable** records in development.

## Stripe

Checkout calls the real Stripe test API and needs:

```dotenv
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`13 · Webhooks → Stripe webhook` signs its own body with HMAC-SHA256 using
`stripeWebhookSecret`, so signature verification can be tested without the Stripe CLI.
The bundled event is a harmless `customer.created`; for real payment events use:

```powershell
stripe listen --forward-to 127.0.0.1:8001/api/v1/webhooks/stripe
```

## Run from the command line (optional)

```powershell
npx newman run docs/api/Nocfinity.postman_collection.json `
  -e docs/api/Nocfinity.local.postman_environment.json `
  --folder "00 · Health" `
  --folder "01 · Customer Auth" `
  --folder "02 · Staff Auth" `
  --folder "03 · Catalog (public)"
```

Do not run the whole collection unattended: checkout requires Stripe keys and the
delete requests remove records.
