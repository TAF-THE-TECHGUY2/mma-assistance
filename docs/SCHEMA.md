# MMA — Database Schema

Full reference for the Meridian Medical Assistance (MMA) MySQL database. Every
domain table, column, type, default, nullability, enum, and relationship is
documented below. Columns are `snake_case`. All tables include Laravel
`timestamps` (`created_at`, `updated_at`, `TIMESTAMP NULL`) unless noted.

This document covers the application's domain tables. Laravel also ships
framework tables (`personal_access_tokens`, `cache`, `cache_locks`, `jobs`,
`job_batches`, `failed_jobs`, `sessions`) which are created by the default
migrations and are not part of the business domain.

---

## Enumerations

These string enums are used consistently across the backend and frontend. All
values are lowercase strings.

| Enum             | Values                                                       | Used by                                  |
| ---------------- | ------------------------------------------------------------ | ---------------------------------------- |
| **Role**         | `booking`, `operations`, `billing`, `admin`, `owner`         | `users.role`                             |
| **CaseType**     | `inpatient`, `outpatient`, `laboratory`                      | `cases.case_type`                        |
| **CaseStatus**   | `booked`, `in_progress`, `admin_review`, `billing`, `closed` | `cases.case_status`                      |
| **WorkflowStage**| `operations`, `admin_review`, `billing`, `closed`            | `cases.workflow_stage`                   |
| **Priority**     | `low`, `medium`, `high`, `urgent`                            | `cases.priority`                         |
| **InvoiceStatus**| `pending`, `invoiced`, `paid`                                | `laboratory_details.invoice_status`      |
| **DocumentStatus**| `pending`, `approved`, `rejected`                           | `documents.document_status`              |
| **BillingStatus**| `pending`, `submitted`, `completed`                          | `billings.billing_status`                |

> Note: the per-detail-table `case_status` columns (`inpatient_details`,
> `outpatient_details`, `laboratory_details`) are plain nullable strings, not
> DB enums, even though they conventionally hold `CaseStatus` values.

---

## Entity relationship overview

```
users ──< cases (created_by)
users ──< documents (uploaded_by)
users ──< admin_reviews (reviewed_by)
users ──< audit_logs (user_id)
users ──< notifications (user_id)

patients ──< cases (patient_id)
patients ──< documents (patient_id)

cases ──1 inpatient_details (case_id, unique)
cases ──1 outpatient_details (case_id, unique)
cases ──1 laboratory_details (case_id, unique)
cases ──< documents (case_id)
cases ──< billings (case_id)
cases ──< admin_reviews (case_id)
cases ──< notifications (case_id)
```

`──<` = one-to-many, `──1` = one-to-one (enforced by a unique `case_id`).

---

## `users`

Application users / staff accounts. Authenticatable; issues Sanctum tokens.

| Column              | Type                | Null | Default     | Notes                                   |
| ------------------- | ------------------- | ---- | ----------- | --------------------------------------- |
| `id`                | bigint unsigned PK  | no   | auto        |                                         |
| `name`              | string              | no   |             |                                         |
| `email`             | string              | no   |             | **unique**                              |
| `email_verified_at` | timestamp           | yes  | null        |                                         |
| `password`          | string              | no   |             | bcrypt-hashed; hidden in serialization  |
| `role`              | enum **Role**       | no   | `booking`   | `booking\|operations\|billing\|admin\|owner` |
| `preferences`       | json                | yes  | null        | account-level app preferences           |
| `remember_token`    | string(100)         | yes  | null        | hidden in serialization                 |
| `created_at`        | timestamp           | yes  | null        |                                         |
| `updated_at`        | timestamp           | yes  | null        |                                         |

**Relationships** (model `App\Models\User`):

- `cases()` — hasMany `MedicalCase` via `created_by`
- `documents()` — hasMany `Document` via `uploaded_by`
- `adminReviews()` — hasMany `AdminReview` via `reviewed_by`
- `auditLogs()` — hasMany `AuditLog` via `user_id`
- `userNotifications()` — hasMany `Notification` via `user_id`

Hidden attributes: `password`, `remember_token`. Casts: `email_verified_at` →
datetime, `password` → hashed, `preferences` → array.

---

## `patients`

Registered patients.

| Column               | Type               | Null | Default | Notes        |
| -------------------- | ------------------ | ---- | ------- | ------------ |
| `id`                 | bigint unsigned PK | no   | auto    |              |
| `first_name`         | string             | no   |         |              |
| `surname`            | string             | no   |         |              |
| `date_of_birth`      | date               | no   |         |              |
| `gender`             | string             | no   |         |              |
| `phone`              | string             | no   |         |              |
| `email`              | string             | yes  | null    |              |
| `id_number`          | string             | no   |         | **unique**   |
| `mma_file_number`    | string             | no   |         | **unique**   |
| `area`               | string             | no   |         |              |
| `treating_doctor`    | string             | no   |         |              |
| `date_registered`    | date               | no   |         |              |
| `address`            | text               | yes  | null    |              |
| `emergency_contact`  | string             | yes  | null    |              |
| `medical_aid_number` | string             | yes  | null    |              |
| `created_at`         | timestamp          | yes  | null    |              |
| `updated_at`         | timestamp          | yes  | null    |              |

**Relationships** (model `App\Models\Patient`):

- `cases()` — hasMany `MedicalCase` via `patient_id`
- `documents()` — hasMany `Document` via `patient_id`

---

## `cases`

Medical cases. **Table name is `cases`; the Eloquent model is
`App\Models\MedicalCase`** (because `Case` is a reserved word).

| Column                | Type                    | Null | Default      | Notes                                                |
| --------------------- | ----------------------- | ---- | ------------ | ---------------------------------------------------- |
| `id`                  | bigint unsigned PK      | no   | auto         |                                                      |
| `case_number`         | string                  | no   |              | **unique**; auto-generated (e.g. `IP-202406-AB12CD`) |
| `patient_id`          | bigint unsigned FK      | no   |              | → `patients.id`, cascade on delete                   |
| `case_type`           | enum **CaseType**       | no   |              | `inpatient\|outpatient\|laboratory`                  |
| `case_status`         | enum **CaseStatus**     | no   | `booked`     | `booked\|in_progress\|admin_review\|billing\|closed` |
| `workflow_stage`      | enum **WorkflowStage**  | no   | `operations` | `operations\|admin_review\|billing\|closed`          |
| `priority`            | enum **Priority**       | no   | `medium`     | `low\|medium\|high\|urgent`                          |
| `assigned_department` | string                  | yes  | null         |                                                      |
| `created_by`          | bigint unsigned FK      | yes  | null         | → `users.id`, null on delete                         |
| `date_opened`         | date                    | no   |              |                                                      |
| `created_at`          | timestamp               | yes  | null         |                                                      |
| `updated_at`          | timestamp               | yes  | null         |                                                      |

**Relationships** (model `App\Models\MedicalCase`):

- `patient()` — belongsTo `Patient`
- `creator()` — belongsTo `User` via `created_by`
- `inpatientDetail()` — hasOne `InpatientDetail`
- `outpatientDetail()` — hasOne `OutpatientDetail`
- `laboratoryDetail()` — hasOne `LaboratoryDetail`
- `documents()` — hasMany `Document`
- `billings()` — hasMany `Billing`
- `adminReviews()` — hasMany `AdminReview`
- `notifications()` — hasMany `Notification`
- `auditLogs()` — morphMany `AuditLog`

A type-specific detail row is created automatically when a case is created.

---

## `inpatient_details`

One-to-one extension of an inpatient case (unique `case_id`).

| Column               | Type               | Null | Default | Notes                          |
| -------------------- | ------------------ | ---- | ------- | ------------------------------ |
| `id`                 | bigint unsigned PK | no   | auto    |                                |
| `case_id`            | bigint unsigned FK | no   |         | **unique**, → `cases.id`, cascade |
| `file_number`        | string             | yes  | null    |                                |
| `admission_date`     | date               | yes  | null    |                                |
| `discharge_date`     | date               | yes  | null    |                                |
| `date_to_admin`      | date               | yes  | null    |                                |
| `mr_requested`       | boolean            | no   | `false` | medical records requested      |
| `mr_received`        | boolean            | no   | `false` | medical records received       |
| `admin_closure_date` | date               | yes  | null    |                                |
| `submission_date`    | date               | yes  | null    |                                |
| `date_pastel`        | date               | yes  | null    | date posted to Pastel          |
| `case_status`        | string             | yes  | null    | conventionally a CaseStatus value |
| `created_at`         | timestamp          | yes  | null    |                                |
| `updated_at`         | timestamp          | yes  | null    |                                |

**Relationship**: `case()` — belongsTo `MedicalCase`.

---

## `outpatient_details`

One-to-one extension of an outpatient case (unique `case_id`).

| Column               | Type               | Null | Default | Notes                          |
| -------------------- | ------------------ | ---- | ------- | ------------------------------ |
| `id`                 | bigint unsigned PK | no   | auto    |                                |
| `case_id`            | bigint unsigned FK | no   |         | **unique**, → `cases.id`, cascade |
| `file_date`          | date               | yes  | null    |                                |
| `file_number`        | string             | yes  | null    |                                |
| `consult_date`       | date               | yes  | null    |                                |
| `followup_date`      | date               | yes  | null    |                                |
| `ongoing_treatment`  | boolean            | no   | `false` |                                |
| `date_to_admin`      | date               | yes  | null    |                                |
| `mr_requested`       | boolean            | no   | `false` |                                |
| `mr_received`        | boolean            | no   | `false` |                                |
| `admin_closure_date` | date               | yes  | null    |                                |
| `submission_date`    | date               | yes  | null    |                                |
| `date_pastel`        | date               | yes  | null    |                                |
| `case_status`        | string             | yes  | null    | conventionally a CaseStatus value |
| `created_at`         | timestamp          | yes  | null    |                                |
| `updated_at`         | timestamp          | yes  | null    |                                |

**Relationship**: `case()` — belongsTo `MedicalCase`.

---

## `laboratory_details`

One-to-one extension of a laboratory case (unique `case_id`).

| Column             | Type                    | Null | Default   | Notes                                |
| ------------------ | ----------------------- | ---- | --------- | ------------------------------------ |
| `id`               | bigint unsigned PK      | no   | auto      |                                      |
| `case_id`          | bigint unsigned FK      | no   |           | **unique**, → `cases.id`, cascade    |
| `appointment_date` | date                    | yes  | null      |                                      |
| `treating_doctor`  | string                  | yes  | null      |                                      |
| `area`             | string                  | yes  | null      |                                      |
| `date_registered`  | date                    | yes  | null      |                                      |
| `invoice_status`   | enum **InvoiceStatus**  | no   | `pending` | `pending\|invoiced\|paid`            |
| `lab_type`         | string                  | yes  | null      |                                      |
| `case_status`      | string                  | yes  | null      | conventionally a CaseStatus value    |
| `created_at`       | timestamp               | yes  | null      |                                      |
| `updated_at`       | timestamp               | yes  | null      |                                      |

**Relationship**: `case()` — belongsTo `MedicalCase`.

---

## `documents`

Uploaded documents, optionally tied to a patient and/or a case.

| Column              | Type                    | Null | Default   | Notes                                  |
| ------------------- | ----------------------- | ---- | --------- | -------------------------------------- |
| `id`                | bigint unsigned PK      | no   | auto      |                                        |
| `name`              | string                  | no   |           |                                        |
| `patient_id`        | bigint unsigned FK      | yes  | null      | → `patients.id`, cascade on delete     |
| `case_id`           | bigint unsigned FK      | yes  | null      | → `cases.id`, cascade on delete        |
| `upload_date`       | date                    | no   |           |                                        |
| `document_type`     | string                  | yes  | null      | e.g. "Lab Report", "Consent Form"      |
| `file_url`          | string                  | no   |           | URL or storage path                    |
| `uploaded_by`       | bigint unsigned FK      | yes  | null      | → `users.id`, null on delete           |
| `document_status`   | enum **DocumentStatus** | no   | `pending` | `pending\|approved\|rejected`          |
| `document_category` | string                  | yes  | null      | e.g. "clinical", "administrative"      |
| `created_at`        | timestamp               | yes  | null      |                                        |
| `updated_at`        | timestamp               | yes  | null      |                                        |

**Relationships** (model `App\Models\Document`):

- `patient()` — belongsTo `Patient`
- `case()` — belongsTo `MedicalCase`
- `uploader()` — belongsTo `User` via `uploaded_by`

---

## `billings`

Billing records for cases. A case may have one or more billing rows
(hasMany); in practice the system updates a single billing row per case.

| Column            | Type                   | Null | Default   | Notes                              |
| ----------------- | ---------------------- | ---- | --------- | ---------------------------------- |
| `id`              | bigint unsigned PK     | no   | auto      |                                    |
| `case_id`         | bigint unsigned FK     | no   |           | → `cases.id`, cascade on delete    |
| `billing_status`  | enum **BillingStatus** | no   | `pending` | `pending\|submitted\|completed`    |
| `submission_date` | date                   | yes  | null      |                                    |
| `date_pastel`     | date                   | yes  | null      | date posted to Pastel              |
| `notes`           | text                   | yes  | null      |                                    |
| `created_at`      | timestamp              | yes  | null      |                                    |
| `updated_at`      | timestamp              | yes  | null      |                                    |

**Relationship** (model `App\Models\Billing`): `case()` — belongsTo `MedicalCase`.

---

## `admin_reviews`

Admin review records (one per review action against a case).

| Column               | Type               | Null | Default | Notes                          |
| -------------------- | ------------------ | ---- | ------- | ------------------------------ |
| `id`                 | bigint unsigned PK | no   | auto    |                                |
| `case_id`            | bigint unsigned FK | no   |         | → `cases.id`, cascade on delete |
| `admin_closure_date` | date               | yes  | null    |                                |
| `review_notes`       | text               | yes  | null    |                                |
| `reviewed_by`        | bigint unsigned FK | yes  | null    | → `users.id`, null on delete   |
| `created_at`         | timestamp          | yes  | null    |                                |
| `updated_at`         | timestamp          | yes  | null    |                                |

**Relationships** (model `App\Models\AdminReview`):

- `case()` — belongsTo `MedicalCase`
- `reviewer()` — belongsTo `User` via `reviewed_by`

---

## `audit_logs`

Immutable audit trail. Written by `App\Services\AuditService` on every
mutating action. Polymorphic-style `auditable_type`/`auditable_id` columns
reference the affected model.

| Column           | Type               | Null | Default | Notes                                  |
| ---------------- | ------------------ | ---- | ------- | -------------------------------------- |
| `id`             | bigint unsigned PK | no   | auto    |                                        |
| `user_id`        | bigint unsigned FK | yes  | null    | → `users.id`, null on delete; actor    |
| `action`         | string             | no   |         | e.g. `case.created`, `billing.updated` |
| `auditable_type` | string             | yes  | null    | model class, e.g. `App\Models\MedicalCase` |
| `auditable_id`   | bigint unsigned    | yes  | null    | id of the affected record              |
| `changes`        | json               | yes  | null    | `{ before, after }` diff (varies)      |
| `description`    | text               | yes  | null    | human-readable summary                 |
| `created_at`     | timestamp          | yes  | null    |                                        |
| `updated_at`     | timestamp          | yes  | null    |                                        |

**Index**: composite index on (`auditable_type`, `auditable_id`).

**Relationship** (model `App\Models\AuditLog`): `user()` — belongsTo `User`.

Common `action` values seen across the app: `auth.login`, `auth.logout`,
`patient.created`, `patient.updated`, `patient.deleted`, `case.created`,
`case.updated`, `case.deleted`, `case.sent_to_operations`,
`case.sent_to_admin_review`, `case.sent_to_billing`, `case.closed`,
`inpatient.updated`, `outpatient.updated`, `laboratory.updated`,
`document.created`, `document.deleted`, `billing.updated`,
`admin_review.approved`, `admin_review.returned`, `admin_review.closed`,
`user.created`, `user.updated`, `user.deleted`.

---

## `notifications`

Application notification feed. May be targeted at a user (`user_id`) or
broadcast to everyone (`user_id` null). Written by
`App\Services\NotificationService`.

| Column       | Type               | Null | Default | Notes                                   |
| ------------ | ------------------ | ---- | ------- | --------------------------------------- |
| `id`         | bigint unsigned PK | no   | auto    |                                         |
| `type`       | string             | no   |         | e.g. `case.created`, `billing.completed`|
| `message`    | text               | no   |         |                                         |
| `case_id`    | bigint unsigned FK | yes  | null    | → `cases.id`, cascade on delete         |
| `user_id`    | bigint unsigned FK | yes  | null    | → `users.id`, cascade on delete; null = broadcast |
| `read`       | boolean            | no   | `false` |                                         |
| `created_at` | timestamp          | yes  | null    |                                         |
| `updated_at` | timestamp          | yes  | null    |                                         |

**Relationships** (model `App\Models\Notification`):

- `case()` — belongsTo `MedicalCase`
- `user()` — belongsTo `User`

---

## Cascade / delete behaviour summary

| Parent deleted | Effect on children                                                   |
| -------------- | -------------------------------------------------------------------- |
| `patients`     | `cases`, `documents` referencing it are **cascade deleted**.         |
| `cases`        | `inpatient_details`, `outpatient_details`, `laboratory_details`, `documents`, `billings`, `admin_reviews`, `notifications` are **cascade deleted**. |
| `users`        | `cases.created_by`, `documents.uploaded_by`, `admin_reviews.reviewed_by`, `audit_logs.user_id` are set **null**; `notifications.user_id` is **cascade deleted**. |
