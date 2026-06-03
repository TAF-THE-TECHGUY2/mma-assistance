# Meridian Medical Assistance (MMA) — Backend API

Laravel 11 + PHP 8.2 + MySQL + Laravel Sanctum REST API for the MMA case
management platform. The frontend (React + Vite) lives in `../frontend` and
talks to this API at `/api` using a Sanctum bearer token.

## Requirements

- PHP **8.2+** (with the usual Laravel extensions: `pdo_mysql`, `mbstring`,
  `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`)
- Composer 2
- MySQL 8 (or MariaDB 10.6+)

## Quick start

```bash
# 1. Install PHP dependencies
composer install

# 2. Create your environment file and generate an app key
cp .env.example .env
php artisan key:generate

# 3. Configure the database in .env
#    DB_CONNECTION=mysql
#    DB_HOST=127.0.0.1
#    DB_PORT=3306
#    DB_DATABASE=mma
#    DB_USERNAME=root
#    DB_PASSWORD=
#    (create the `mma` schema first, e.g. `mysql -uroot -e "CREATE DATABASE mma"`)

# 4. Run migrations and seed demo data
php artisan migrate --seed

# 5. Serve the API (defaults to http://127.0.0.1:8000)
php artisan serve
```

The one-line version once `.env` and the database exist:

```bash
composer install && php artisan migrate --seed && php artisan serve
```

## Authentication

This API uses **Laravel Sanctum**. The SPA flow:

1. `POST /api/login` with `{ email, password }` returns `{ token, user }`.
2. The frontend stores the token in `localStorage` under the key `mma_token`
   and sends it as `Authorization: Bearer <token>` on every request.
3. `POST /api/logout` revokes the current token. `GET /api/me` returns the
   authenticated user.

CORS for the Vite dev server (`http://localhost:5173`) is configured in
`config/cors.php`, and stateful SPA domains are listed in
`config/sanctum.php` (override via `SANCTUM_STATEFUL_DOMAINS` in `.env`).

## Role-based access control

A custom middleware alias `role` is registered in `bootstrap/app.php`
(`App\Http\Middleware\EnsureUserHasRole`). Protect routes like so:

```php
Route::post('/cases', [CaseController::class, 'store'])
    ->middleware('role:booking,owner');
```

Roles: `booking | operations | billing | admin | owner`. The `owner` role is a
superset and always passes the check.

## API surface (all under `/api`, JSON)

- Auth: `POST /login`, `POST /logout`, `GET /me`
- Patients: `GET/POST /patients`, `GET/PUT/DELETE /patients/{id}`,
  `GET /patients/{id}/cases`, `GET /patients/{id}/documents`
- Cases: `GET/POST /cases`, `GET/PUT/DELETE /cases/{id}`,
  workflow transitions `POST /cases/{id}/send-to-operations`,
  `/send-to-admin-review`, `/send-to-billing`, `/close`
- Case detail sub-resources: `GET/PUT /cases/{id}/inpatient | /outpatient | /laboratory`
- Documents: `GET/POST /documents`, `GET/DELETE /documents/{id}`
- Billing: `GET /billing`, `PUT /billing/{caseId}`
- Admin review: `GET /admin-review`, `POST /admin-review/{caseId}` (approve|return|close)
- Dashboard / reports: `GET /dashboard/stats`, `GET /reports/{report}`
- Misc: `GET /notifications`, `GET /audit-logs`, `GET/POST/PUT/DELETE /users`

List endpoints return `{ data: [...], meta: {...} }`; single-resource endpoints
return `{ data: {...} }`.

## Project layout (backend scaffolding)

```
backend/
├── artisan
├── composer.json
├── .env.example
├── bootstrap/
│   ├── app.php           # routing, middleware aliases (role), JSON exceptions
│   └── providers.php
├── config/
│   ├── cors.php          # allows the Vite frontend origin
│   └── sanctum.php       # stateful domains + token config
├── app/Http/Middleware/
│   └── EnsureUserHasRole.php
├── routes/               # api.php, web.php, console.php (other agents)
├── app/                  # Models, Controllers, etc. (other agents)
└── database/             # migrations, seeders, factories (other agents)
```

> Note: This README documents the scaffolding/config layer. Models,
> controllers, migrations, routes, and seeders are provided by the other
> backend modules of the project.
