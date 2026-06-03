# MMA — REST API Reference

Complete reference for the Meridian Medical Assistance (MMA) backend API.

- **Base path:** all routes are prefixed with `/api`.
- **Format:** JSON request and response bodies.
- **Auth:** Laravel Sanctum bearer tokens. Send
  `Authorization: Bearer <token>` on every protected request. The token is
  obtained from `POST /api/login` and stored client-side under the
  `localStorage` key `mma_token`.
- **Response envelope:**
  - List endpoints return `{ "data": [...], "meta": {...} }`.
  - Single-resource endpoints return `{ "data": {...} }`.
  - Mutations that don't return a resource return `{ "message": "..." }`.

## Conventions in this document

- **Role required** lists the roles permitted to call the endpoint. `owner` is a
  superset and is always accepted on protected mutations. Endpoints marked
  *any authenticated* require a valid token but no specific role. Endpoints
  marked *public* require no token.
- Enforcement uses the `role:` route middleware
  (`App\Http\Middleware\RoleMiddleware`).

## Standard error responses

| Status | When                              | Body shape                                        |
| ------ | --------------------------------- | ------------------------------------------------- |
| 401    | Missing/invalid token             | `{ "message": "Unauthenticated." }`               |
| 403    | Authenticated but wrong role      | `{ "message": "..." }`                            |
| 404    | Resource not found / unknown report | `{ "message": "..." }`                          |
| 422    | Validation failure                | `{ "message": "...", "errors": { "field": ["..."] } }` |

---

## Authentication

### POST `/api/login` — *public*

Authenticate and receive a bearer token.

Request:

```json
{ "email": "owner@mma.test", "password": "password" }
```

Response `200`:

```json
{
  "token": "1|plain-text-sanctum-token",
  "user": {
    "id": 5, "name": "Olivia Owner", "email": "owner@mma.test",
    "role": "owner", "email_verified_at": "2026-06-01T00:00:00.000000Z",
    "created_at": "...", "updated_at": "..."
  }
}
```

Invalid credentials return `422` with an `errors.email` message.

### POST `/api/logout` — *any authenticated*

Revoke the current access token.

Response `200`: `{ "message": "Logged out successfully." }`

### GET `/api/me` — *any authenticated*

Return the authenticated user.

Response `200`: `{ "data": { ...user } }`

### PUT `/api/me` — *any authenticated*

Update the authenticated user's own profile and application preferences.

Request fields (all optional): `name` (string), `email` (email, unique
ignoring current user), `preferences.emailNotifications` (bool),
`preferences.desktopNotifications` (bool), `preferences.compactTables` (bool).

Response `200`: `{ "data": { ...user } }`

---

## Patients

The patient object contains all `patients` columns (see `SCHEMA.md`).

### GET `/api/patients` — *any authenticated*

List patients (paginated).

Query params (all optional): `search` (matches first_name, surname, id_number,
mma_file_number, phone, email), `area`, `sort`
(`first_name|surname|date_registered|created_at|mma_file_number`),
`direction` (`asc|desc`, default `desc`), `per_page` (default `25`).

Response `200`:

```json
{
  "data": [ { "id": 1, "first_name": "Thabo", "surname": "Mokoena", "...": "" } ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 25, "total": 8 }
}
```

### POST `/api/patients` — `booking`, `owner`

Create a patient.

Request body:

| Field                | Required | Rules                                |
| -------------------- | -------- | ------------------------------------ |
| `first_name`         | yes      | string, max 255                      |
| `surname`            | yes      | string, max 255                      |
| `date_of_birth`      | yes      | date                                 |
| `gender`             | yes      | string, max 50                       |
| `phone`              | yes      | string, max 50                       |
| `email`              | no       | email, max 255                       |
| `id_number`          | yes      | string, max 50, unique               |
| `mma_file_number`    | yes      | string, max 50, unique               |
| `area`               | yes      | string, max 255                      |
| `treating_doctor`    | yes      | string, max 255                      |
| `date_registered`    | yes      | date                                 |
| `address`            | no       | string                               |
| `emergency_contact`  | no       | string, max 255                      |
| `medical_aid_number` | no       | string, max 255                      |

Response `201`: `{ "data": { ...patient } }`

### GET `/api/patients/{id}` — *any authenticated*

Response `200`: `{ "data": { ...patient } }` (`404` if not found).

### PUT `/api/patients/{id}` — `operations`, `admin`, `owner`

Update a patient. All fields optional (`sometimes`); same rules as create.
`id_number`/`mma_file_number` uniqueness ignores the current record.

Response `200`: `{ "data": { ...patient } }`

### DELETE `/api/patients/{id}` — `admin`, `owner`

Response `200`: `{ "message": "Patient deleted." }`

### GET `/api/patients/{id}/cases` — *any authenticated*

List the patient's cases (newest first, not paginated).

Response `200`: `{ "data": [ { ...case } ], "meta": { "total": 3 } }`

### GET `/api/patients/{id}/documents` — *any authenticated*

List the patient's documents (newest upload first).

Response `200`: `{ "data": [ { ...document } ], "meta": { "total": 2 } }`

---

## Cases

The case object contains all `cases` columns. List/show responses eager-load
`patient`; `show` additionally loads detail records, billings, admin reviews,
and documents.

### GET `/api/cases` — *any authenticated*

List cases (paginated, with `patient`).

Query params (all optional): `case_status`, `case_type`, `workflow_stage`,
`priority`, `assigned_department`, `search` (case_number or patient
name/mma_file_number), `sort`
(`case_number|case_status|workflow_stage|priority|date_opened|created_at`),
`direction` (`asc|desc`, default `desc`), `per_page` (default `25`).

Response `200`:

```json
{
  "data": [ { "id": 1, "case_number": "CASE-00001", "case_type": "inpatient",
              "case_status": "booked", "workflow_stage": "operations",
              "priority": "medium", "patient": { "...": "" } } ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 25, "total": 12 }
}
```

### POST `/api/cases` — `booking`, `owner`

Create a case. A unique `case_number` is auto-generated (prefix `IP`/`OP`/`LAB`
by type, e.g. `IP-202406-AB12CD`), `created_by` is set to the current user, and
a type-specific detail row is auto-created.

Request body:

| Field                 | Required | Rules                                                |
| --------------------- | -------- | ---------------------------------------------------- |
| `patient_id`          | yes      | integer, exists in patients                          |
| `case_type`           | yes      | `inpatient\|outpatient\|laboratory`                  |
| `case_status`         | no       | `booked\|in_progress\|admin_review\|billing\|closed` (default `booked`) |
| `workflow_stage`      | no       | `operations\|admin_review\|billing\|closed` (default `operations`) |
| `priority`            | no       | `low\|medium\|high\|urgent` (default `medium`)       |
| `assigned_department` | no       | string, max 255                                      |
| `date_opened`         | no       | date (default today)                                 |

Response `201`: `{ "data": { ...case, "patient": { ... } } }`

### GET `/api/cases/{id}` — *any authenticated*

Full case with relations.

Response `200`:

```json
{
  "data": {
    "id": 1, "case_number": "CASE-00001", "...": "",
    "patient": { "...": "" },
    "inpatient_detail": { "...": "" },
    "outpatient_detail": null,
    "laboratory_detail": null,
    "billings": [ { "...": "" } ],
    "admin_reviews": [ { "...": "" } ],
    "documents": [ { "...": "" } ]
  }
}
```

### PUT `/api/cases/{id}` — `operations`, `admin`, `owner`

Update case fields. All optional (`sometimes`): `case_status`,
`workflow_stage`, `priority`, `assigned_department`, `date_opened`.

Response `200`: `{ "data": { ...case, "patient": { ... } } }`

### DELETE `/api/cases/{id}` — `admin`, `owner`

Response `200`: `{ "message": "Case deleted." }`

---

## Case workflow transitions

Each transition updates `case_status` + `workflow_stage`, writes an audit log,
and emits a notification. All return `200` with
`{ "data": { ...case, "patient": { ... } } }`.

| Endpoint                                       | Role required                         | Sets case_status → workflow_stage |
| ---------------------------------------------- | ------------------------------------- | --------------------------------- |
| `POST /api/cases/{id}/send-to-operations`      | `operations`, `admin`, `owner`        | `in_progress` → `operations`      |
| `POST /api/cases/{id}/send-to-admin-review`    | `operations`, `admin`, `owner`        | `admin_review` → `admin_review`   |
| `POST /api/cases/{id}/send-to-billing`         | `operations`, `admin`, `billing`, `owner` | `billing` → `billing`         |
| `POST /api/cases/{id}/close`                   | `admin`, `owner`                      | `closed` → `closed`               |

No request body is required.

---

## Case-type detail records

Each case has exactly one detail record matching its type. `GET` lazily
creates the row if missing (`firstOrCreate`). `PUT` accepts only that type's
fields; all fields are optional/nullable.

### Inpatient — GET/PUT `/api/cases/{id}/inpatient`

- GET: *any authenticated* → `{ "data": { ...inpatient_detail } }`
- PUT: `operations`, `admin`, `owner`

PUT body fields: `file_number` (string), `admission_date` (date),
`discharge_date` (date), `date_to_admin` (date), `mr_requested` (bool),
`mr_received` (bool), `admin_closure_date` (date), `submission_date` (date),
`date_pastel` (date), `case_status` (string). Response `200`:
`{ "data": { ...inpatient_detail } }`.

### Outpatient — GET/PUT `/api/cases/{id}/outpatient`

- GET: *any authenticated* → `{ "data": { ...outpatient_detail } }`
- PUT: `operations`, `admin`, `owner`

PUT body fields: `file_date` (date), `file_number` (string), `consult_date`
(date), `followup_date` (date), `ongoing_treatment` (bool), `date_to_admin`
(date), `mr_requested` (bool), `mr_received` (bool), `admin_closure_date`
(date), `submission_date` (date), `date_pastel` (date), `case_status`
(string). Response `200`: `{ "data": { ...outpatient_detail } }`.

### Laboratory — GET/PUT `/api/cases/{id}/laboratory`

- GET: *any authenticated* → `{ "data": { ...laboratory_detail } }`
- PUT: `operations`, `admin`, `owner`

PUT body fields: `appointment_date` (date), `treating_doctor` (string), `area`
(string), `date_registered` (date), `invoice_status`
(`pending|invoiced|paid`), `lab_type` (string), `case_status` (string).
Response `200`: `{ "data": { ...laboratory_detail } }`.

---

## Documents

### GET `/api/documents` — *any authenticated*

List documents (paginated, with `patient` and `uploader`).

Query params (all optional): `patient_id`, `case_id`, `document_status`,
`document_category`, `document_type`, `search` (name), `per_page` (default
`25`). Ordered by upload date desc.

Response `200`:

```json
{
  "data": [ { "id": 1, "name": "Lab Report - CASE-00001", "document_status": "pending",
              "file_url": "...", "patient": { "...": "" }, "uploader": { "...": "" } } ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 25, "total": 8 }
}
```

### POST `/api/documents` — `booking`, `operations`, `admin`, `owner`

Create a document. Accepts either an uploaded `file` (stored on the public disk;
`file_url` is then derived) or a pre-supplied `file_url`. Send as
`multipart/form-data` when uploading a file. `uploaded_by` is set to the current
user.

Request fields:

| Field               | Required | Rules                                |
| ------------------- | -------- | ------------------------------------ |
| `name`              | yes      | string, max 255                      |
| `patient_id`        | no       | integer, exists in patients          |
| `case_id`           | no       | integer, exists in cases             |
| `upload_date`       | no       | date (default today)                 |
| `document_type`     | no       | string, max 255                      |
| `document_category` | no       | string, max 255                      |
| `document_status`   | no       | `pending\|approved\|rejected` (default `pending`) |
| `file_url`          | no       | string, max 2048                     |
| `file`              | no       | file, max 20480 KB                   |

Response `201`: `{ "data": { ...document } }`

### GET `/api/documents/{id}` — *any authenticated*

Response `200`: `{ "data": { ...document, "patient": {...}, "uploader": {...} } }`

### DELETE `/api/documents/{id}` — `operations`, `admin`, `owner`

Response `200`: `{ "message": "Document deleted." }`

---

## Billing

### GET `/api/billing` — *any authenticated*

Returns all billing records grouped into `pending`, `submitted`, and `history`
(completed). Each billing eager-loads `case.patient`.

Response `200`:

```json
{
  "data": {
    "pending":   [ { "id": 1, "case_id": 7, "billing_status": "pending",   "case": { "...": "" } } ],
    "submitted": [ { "id": 2, "case_id": 7, "billing_status": "submitted", "case": { "...": "" } } ],
    "history":   [ { "id": 3, "case_id": 8, "billing_status": "completed", "case": { "...": "" } } ]
  },
  "meta": { "pending": 1, "submitted": 1, "history": 1, "total": 3 }
}
```

### PUT `/api/billing/{caseId}` — `billing`, `owner`

Update (or create) the billing record for a case. The `{caseId}` is a **case
id**, not a billing id. Emits a notification when status becomes `submitted` or
`completed`.

Request fields (all optional): `billing_status` (`pending|submitted|completed`,
defaults to `pending` if absent), `submission_date` (date), `date_pastel`
(date), `notes` (string).

Response `200`: `{ "data": { ...billing, "case": { "patient": {...} } } }`

---

## Admin review

### GET `/api/admin-review` — *any authenticated*

List cases currently awaiting admin review (`workflow_stage = admin_review`),
with `patient` and `adminReviews`.

Response `200`: `{ "data": [ { ...case } ], "meta": { "total": 1 } }`

### POST `/api/admin-review/{caseId}` — `admin`, `owner`

Perform an admin action against a case. Records an `admin_reviews` row
(`reviewed_by` = current user), updates the case, writes an audit log, and
emits a notification.

Request fields:

| Field                | Required | Rules                       |
| -------------------- | -------- | --------------------------- |
| `action`             | yes      | `approve\|return\|close`    |
| `review_notes`       | no       | string                      |
| `admin_closure_date` | no       | date (defaults to today on `close`) |

Action effects (case_status → workflow_stage):

| `action`  | Result                                   |
| --------- | ---------------------------------------- |
| `approve` | `billing` → `billing` (sent to billing)  |
| `return`  | `in_progress` → `operations`             |
| `close`   | `closed` → `closed`                      |

Response `200`:

```json
{ "data": { "case": { ...case, "patient": {...} }, "review": { ...adminReview } } }
```

---

## Dashboard

### GET `/api/dashboard/stats` — *any authenticated*

Aggregate counts, workflow alerts, 12-month trends, and the 10 most recent
cases (with `patient`).

Response `200`:

```json
{
  "data": {
    "total_patients": 8,
    "total_cases": 12,
    "open_cases": 8,
    "closed_cases": 4,
    "cases_by_status": { "booked": 3, "in_progress": 3, "admin_review": 1, "billing": 2, "closed": 3 },
    "cases_by_type": { "inpatient": 4, "outpatient": 4, "laboratory": 4 },
    "cases_by_stage": { "operations": 6, "admin_review": 1, "billing": 2, "closed": 3 },
    "pending_billing": 2,
    "pending_admin_review": 1,
    "pending_documents": 2,
    "recent_cases": [ { ...case, "patient": {...} } ],
    "monthly_trends": [ { "month": "2026-06", "opened": 3, "closed": 1 } ]
  }
}
```

---

## Reports

### GET `/api/reports/{report}` — *any authenticated*

Dispatch to a named report. Unknown report names return `404`
`{ "message": "Unknown report: <name>." }`. All responses are
`{ "data": [...], "meta": { "report": "<name>", "total": 3 } }`.
CamelCase aliases are accepted for backwards compatibility, but the canonical
names are hyphenated.

| `{report}`                  | `data` shape                                                       |
| --------------------------- | ------------------------------------------------------------------ |
| `cases-by-status`           | `[ { "status": "booked", "count": 3 }, ... ]`                      |
| `cases-by-type`             | `[ { "type": "inpatient", "count": 4 }, ... ]`                     |
| `open-cases-by-department`  | `[ { "department": "Operations"\|null, "count": 5 }, ... ]`        |
| `closed-cases-this-month`   | `[ { "case_id": 1, "case_number": "CASE-00001", "case_type": "inpatient", "closed_at": "2026-06-01" }, ... ]` |
| `pending-billing`           | `[ { "billing_id": 1, "case_id": 7, "case_number": "CASE-00007", "billing_status": "pending" }, ... ]` |
| `monthly-case-trends`       | `[ { "month": "2026-06", "opened": 3, "closed": 1 }, ... ]` (12 trailing months) |

---

## Notifications

### GET `/api/notifications` — *any authenticated*

List notifications for the current user plus broadcast notices (`user_id`
null), newest first (paginated).

Query params (optional): `unread` (truthy → only unread), `per_page` (default
`50`).

Response `200`:

```json
{
  "data": [ { "id": 1, "type": "case.created", "message": "...",
              "case_id": 1, "user_id": null, "read": false } ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 50, "total": 4, "unread": 3 }
}
```

> The notification model also supports mark-as-read operations, but only
> `GET /api/notifications` is currently exposed as a route.

---

## Audit logs

### GET `/api/audit-logs` — `admin`, `owner`

List audit-log entries (paginated, with `user`), newest first.

Query params (optional): `user_id`, `action`, `auditable_type`, `auditable_id`,
`search` (action or description), `per_page` (default `50`).

Response `200`:

```json
{
  "data": [ { "id": 1, "user_id": 1, "action": "case.created",
              "auditable_type": "App\\Models\\MedicalCase", "auditable_id": 1,
              "changes": { "case_type": "inpatient", "case_status": "booked" },
              "description": "Case CASE-00001 created.", "user": { "...": "" } } ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 50, "total": 40 }
}
```

---

## Users

All user endpoints require role `admin` or `owner`. User objects never include
the `password` or `remember_token` fields.

### GET `/api/users`

List users (paginated). Query params (optional): `role`, `search`
(name/email), `per_page` (default `50`). Ordered by name.

Response `200`:

```json
{
  "data": [ { "id": 1, "name": "Adam Admin", "email": "admin@mma.test", "role": "admin" } ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 50, "total": 5 }
}
```

### POST `/api/users`

Create a user.

| Field      | Required | Rules                                             |
| ---------- | -------- | ------------------------------------------------- |
| `name`     | yes      | string, max 255                                   |
| `email`    | yes      | email, max 255, unique                            |
| `password` | yes      | string, min 8                                     |
| `role`     | yes      | `booking\|operations\|billing\|admin\|owner`      |

Response `201`: `{ "data": { ...user } }`

### GET `/api/users/{id}`

Response `200`: `{ "data": { ...user } }`

### PUT `/api/users/{id}`

Update a user. All fields optional: `name` (string), `email` (email, unique
ignoring current), `password` (min 8; only applied if non-empty), `role`
(one of the canonical roles).

Response `200`: `{ "data": { ...user } }`

### DELETE `/api/users/{id}`

Response `200`: `{ "message": "User deleted." }`

---

## Endpoint summary

| Method | Path                                   | Role required                             |
| ------ | -------------------------------------- | ----------------------------------------- |
| POST   | `/api/login`                           | public                                    |
| POST   | `/api/logout`                          | any authenticated                         |
| GET    | `/api/me`                              | any authenticated                         |
| PUT    | `/api/me`                              | any authenticated                         |
| GET    | `/api/patients`                        | any authenticated                         |
| POST   | `/api/patients`                        | booking, owner                            |
| GET    | `/api/patients/{id}`                   | any authenticated                         |
| PUT    | `/api/patients/{id}`                   | operations, admin, owner                  |
| DELETE | `/api/patients/{id}`                   | admin, owner                              |
| GET    | `/api/patients/{id}/cases`             | any authenticated                         |
| GET    | `/api/patients/{id}/documents`         | any authenticated                         |
| GET    | `/api/cases`                           | any authenticated                         |
| POST   | `/api/cases`                           | booking, owner                            |
| GET    | `/api/cases/{id}`                      | any authenticated                         |
| PUT    | `/api/cases/{id}`                      | operations, admin, owner                  |
| DELETE | `/api/cases/{id}`                      | admin, owner                              |
| POST   | `/api/cases/{id}/send-to-operations`   | operations, admin, owner                  |
| POST   | `/api/cases/{id}/send-to-admin-review` | operations, admin, owner                  |
| POST   | `/api/cases/{id}/send-to-billing`      | operations, admin, billing, owner         |
| POST   | `/api/cases/{id}/close`                | admin, owner                              |
| GET    | `/api/cases/{id}/inpatient`            | any authenticated                         |
| PUT    | `/api/cases/{id}/inpatient`            | operations, admin, owner                  |
| GET    | `/api/cases/{id}/outpatient`           | any authenticated                         |
| PUT    | `/api/cases/{id}/outpatient`           | operations, admin, owner                  |
| GET    | `/api/cases/{id}/laboratory`           | any authenticated                         |
| PUT    | `/api/cases/{id}/laboratory`           | operations, admin, owner                  |
| GET    | `/api/documents`                       | any authenticated                         |
| POST   | `/api/documents`                       | booking, operations, admin, owner         |
| GET    | `/api/documents/{id}`                  | any authenticated                         |
| DELETE | `/api/documents/{id}`                  | operations, admin, owner                  |
| GET    | `/api/billing`                         | any authenticated                         |
| PUT    | `/api/billing/{caseId}`                | billing, owner                            |
| GET    | `/api/admin-review`                    | any authenticated                         |
| POST   | `/api/admin-review/{caseId}`           | admin, owner                              |
| GET    | `/api/dashboard/stats`                 | any authenticated                         |
| GET    | `/api/reports/{report}`                | any authenticated                         |
| GET    | `/api/notifications`                   | any authenticated                         |
| GET    | `/api/audit-logs`                      | admin, owner                              |
| GET    | `/api/users`                           | admin, owner                              |
| POST   | `/api/users`                           | admin, owner                              |
| GET    | `/api/users/{id}`                      | admin, owner                              |
| PUT    | `/api/users/{id}`                      | admin, owner                              |
| DELETE | `/api/users/{id}`                      | admin, owner                              |
