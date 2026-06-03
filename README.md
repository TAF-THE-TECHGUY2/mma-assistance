# Meridian Medical Assistance (MMA)

Meridian Medical Assistance (MMA) is a medical case-management platform for a
South African medical assistance practice. It tracks patients, opens and routes
medical cases (inpatient, outpatient, laboratory) through an operational
workflow (operations → admin review → billing → closed), manages documents,
billing, admin reviews, and keeps a full audit trail and notification feed.

The system is a classic two-tier web application:

- **Backend** — a Laravel 11 JSON REST API secured with Laravel Sanctum bearer
  tokens and role-based access control.
- **Frontend** — a React 18 + TypeScript single-page app built with Vite and
  styled with Tailwind CSS.

---

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Domain model & workflow](#domain-model--workflow)
- [Roles & permissions](#roles--permissions)
- [Setup — backend](#setup--backend)
- [Setup — frontend](#setup--frontend)
- [Running both together](#running-both-together)
- [Seeded login credentials](#seeded-login-credentials)
- [Module / feature list](#module--feature-list)
- [Further documentation](#further-documentation)

---

## Architecture

```
┌──────────────────────────┐         HTTPS / JSON          ┌───────────────────────────┐
│  Frontend (React + Vite) │  ───────────────────────────► │  Backend (Laravel 11 API) │
│                          │   Authorization: Bearer       │                           │
│  - React Router v6       │   <mma_token>                 │  - Sanctum auth           │
│  - Axios (src/api)       │ ◄───────────────────────────  │  - role: middleware       │
│  - Tailwind UI           │   { data, meta } JSON         │  - Controllers / Services │
└──────────────────────────┘                               └─────────────┬─────────────┘
                                                                          │ Eloquent ORM
                                                                          ▼
                                                                ┌───────────────────┐
                                                                │   MySQL database  │
                                                                └───────────────────┘
```

- The SPA authenticates via `POST /api/login`, receives a Sanctum personal
  access token, stores it in `localStorage` under the key **`mma_token`**, and
  sends it as an `Authorization: Bearer <token>` header on every request.
- All API routes are prefixed with `/api` and return JSON. List endpoints
  return `{ data: [...], meta: {...} }`; single-resource endpoints return
  `{ data: {...} }`.
- Authorization is enforced by a custom middleware alias `role` (mapped to
  `App\Http\Middleware\RoleMiddleware` in `backend/bootstrap/app.php`). It
  accepts a comma-separated list of roles, e.g. `role:operations,admin,owner`.
  The `owner` role is a superset and always passes.
- Every mutating action writes an **audit log** entry and, where relevant, emits
  a **notification** (handled inside the controllers via `AuditService` and
  `NotificationService`).

---

## Tech stack

### Backend

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Language       | PHP 8.2+                                  |
| Framework      | Laravel 11                               |
| Auth           | Laravel Sanctum (bearer tokens)          |
| Database       | MySQL 8 / MariaDB 10.6+                   |
| REPL / tooling | Laravel Tinker, Pint, PHPUnit, Faker     |

### Frontend

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Language       | TypeScript (strict)                      |
| Framework      | React 18 (functional components + hooks) |
| Build tool     | Vite 5                                    |
| Routing        | React Router v6                          |
| HTTP client    | Axios                                    |
| Styling        | Tailwind CSS 3 (medical teal/blue theme) |
| Charts         | Recharts                                 |
| Icons          | lucide-react                             |

---

## Repository layout

```
medical room/
├── README.md                  # this file (project overview)
├── docs/
│   ├── SCHEMA.md              # full database schema reference
│   └── API.md                 # full REST API reference
├── backend/                   # Laravel 11 API
│   ├── app/
│   │   ├── Http/Controllers/Api/   # one controller per resource
│   │   ├── Http/Middleware/        # RoleMiddleware (alias: role)
│   │   ├── Http/Requests/          # FormRequest validators
│   │   ├── Models/                 # Eloquent models
│   │   ├── Policies/               # CasePolicy
│   │   └── Services/               # AuditService, NotificationService
│   ├── bootstrap/app.php           # routing, middleware aliases, JSON errors
│   ├── config/                     # cors.php, sanctum.php, etc.
│   ├── database/
│   │   ├── migrations/             # schema migrations
│   │   └── seeders/DatabaseSeeder.php
│   ├── routes/api.php              # all /api routes
│   ├── composer.json
│   └── .env.example
└── frontend/                  # React + Vite SPA
    ├── src/
    │   ├── api/                # axios client + per-resource API modules
    │   ├── components/         # Layout, Sidebar, DataTable, charts, ...
    │   ├── context/AuthContext.tsx
    │   ├── pages/              # one component per route
    │   └── types/index.ts      # shared TypeScript interfaces & unions
    ├── package.json
    └── .env.example
```

---

## Domain model & workflow

A **case** belongs to a **patient** and has exactly one of three types:
`inpatient`, `outpatient`, or `laboratory`. Each type has a dedicated detail
table (`inpatient_details`, `outpatient_details`, `laboratory_details`) created
automatically when the case is opened.

Cases progress through a workflow. Two related fields track progress:

- `case_status`: `booked → in_progress → admin_review → billing → closed`
- `workflow_stage`: `operations → admin_review → billing → closed`

Typical lifecycle:

1. **Booking** creates a patient and opens a case (`booked` / `operations`).
2. **Operations** works the case (`send-to-operations` → `in_progress`) and
   sends it for review (`send-to-admin-review` → `admin_review`).
3. **Admin** reviews and either approves it to billing, returns it to
   operations, or closes it (`POST /api/admin-review/{caseId}`).
4. **Billing** records submission/Pastel dates and marks billing complete.
5. The case is **closed** (`closed` / `closed`).

See [`docs/SCHEMA.md`](docs/SCHEMA.md) for the full data model and
[`docs/API.md`](docs/API.md) for every endpoint.

---

## Roles & permissions

There are five canonical roles (stored on `users.role`):

| Role         | Capabilities                                                        |
| ------------ | ------------------------------------------------------------------- |
| `booking`    | Create patients and cases; upload documents.                        |
| `operations` | Update operational fields, manage cases, move workflow stage, edit case-type details, update patients, upload documents. |
| `billing`    | Update billing fields; send cases to billing.                       |
| `admin`      | Review cases (approve / return / close), delete patients/cases/documents, read audit logs, manage users. |
| `owner`      | Full access — a superset of every other role.                       |

Permissions are enforced per route via `role:...` middleware. `owner` is
accepted on every protected mutation. Read endpoints are available to any
authenticated user.

---

## Setup — backend

### Requirements

- PHP **8.2+** with extensions: `pdo_mysql`, `mbstring`, `openssl`,
  `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`
- Composer 2
- MySQL 8 (or MariaDB 10.6+)

### Steps

```bash
cd backend

# 1. Install PHP dependencies
composer install

# 2. Create your environment file and generate an app key
cp .env.example .env
php artisan key:generate

# 3. Create the database (default name: mma) and configure .env:
#    DB_CONNECTION=mysql
#    DB_HOST=127.0.0.1
#    DB_PORT=3306
#    DB_DATABASE=mma
#    DB_USERNAME=root
#    DB_PASSWORD=
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS mma"

# 4. Run migrations and seed demo data (users, patients, cases, etc.)
php artisan migrate --seed

# 5. Serve the API (defaults to http://127.0.0.1:8000)
php artisan serve
```

One-liner once `.env` and the database exist:

```bash
composer install && php artisan migrate --seed && php artisan serve
```

Notes:

- CORS for the Vite dev server (`http://localhost:5173`) is configured in
  `config/cors.php`. Stateful SPA domains live in `config/sanctum.php` and can
  be overridden via `SANCTUM_STATEFUL_DOMAINS` in `.env`.
- Uploaded documents are stored on the `public` disk. Run
  `php artisan storage:link` if you want uploaded files to be web-accessible.
- The API always returns JSON (configured in `bootstrap/app.php`). `401` is
  returned for unauthenticated requests and `422` for validation errors with an
  `errors` object.

---

## Setup — frontend

### Requirements

- Node.js 18+ and npm

### Steps

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
#    VITE_API_URL defaults to "/api" (proxied to the backend in dev)
#    Set it to http://localhost:8000/api if you are not using the dev proxy.

# 3. Start the dev server (defaults to http://localhost:5173)
npm run dev
```

Other scripts:

```bash
npm run build     # type-check then produce a production build
npm run preview   # preview the production build locally
npm run lint      # tsc --noEmit type check
```

The axios instance lives at `src/api/client.ts` (named export `api`). Its
`baseURL` is `import.meta.env.VITE_API_URL || '/api'`, and it attaches the
`Authorization: Bearer <mma_token>` header from `localStorage`.

---

## Running both together

1. Start the backend: `cd backend && php artisan serve` (→ `http://127.0.0.1:8000`).
2. Start the frontend: `cd frontend && npm run dev` (→ `http://localhost:5173`).
3. Open `http://localhost:5173`, and log in with one of the seeded accounts
   below.

---

## Seeded login credentials

Running `php artisan migrate --seed` creates one user per role. **Every seeded
account uses the password `password`.**

| Role         | Name              | Email                  | Password   |
| ------------ | ----------------- | ---------------------- | ---------- |
| `booking`    | Bridget Booking   | `booking@mma.test`     | `password` |
| `operations` | Oliver Operations | `operations@mma.test`  | `password` |
| `billing`    | Bianca Billing    | `billing@mma.test`     | `password` |
| `admin`      | Adam Admin        | `admin@mma.test`       | `password` |
| `owner`      | Olivia Owner      | `owner@mma.test`       | `password` |

The seeder also creates ~8 demo patients and ~12 cases spread across all case
types, statuses, and workflow stages, along with matching detail records,
documents, billing records, admin reviews, notifications, and audit logs.

> Change these credentials before any non-local deployment.

---

## Module / feature list

| Module            | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| Authentication    | Sanctum token login/logout, current-user lookup (`/login`, `/logout`, `/me`). |
| Patients          | CRUD, search/filter, per-patient case and document listings.                |
| Cases             | CRUD, search/filter, auto-generated case numbers, auto-created detail rows. |
| Case workflow     | Transitions: send to operations, send to admin review, send to billing, close. |
| Inpatient details | View/update inpatient-specific fields (admission, discharge, MR flags, …).  |
| Outpatient details| View/update outpatient-specific fields (consult, follow-up, MR flags, …).   |
| Laboratory details| View/update lab-specific fields (appointment, invoice status, lab type, …). |
| Documents         | Upload (file or URL) and metadata, search/filter, view, delete.             |
| Billing           | Pending / submitted / history views; update billing status and Pastel dates.|
| Admin review      | Queue of cases awaiting review; approve / return / close actions.           |
| Dashboard         | Aggregate case counts and recent cases.                                     |
| Reports           | Cases by status/type, open by department, closed this month, pending billing, monthly trends. |
| Notifications     | Per-user + broadcast notification feed with unread counts.                  |
| Audit logs        | Read-only audit trail (admin/owner).                                        |
| Users             | User administration (admin/owner): list, create, view, update, delete.      |

---

## Further documentation

- [`docs/SCHEMA.md`](docs/SCHEMA.md) — full database schema: every table,
  column, enum, and relationship.
- [`docs/API.md`](docs/API.md) — full REST API reference: every endpoint with
  method, path, required role, and request/response shapes.
- [`backend/README.md`](backend/README.md) — backend-specific setup notes.
