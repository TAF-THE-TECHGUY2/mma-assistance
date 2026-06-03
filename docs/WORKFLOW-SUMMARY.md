# Meridian Medical Assistance — Quick Summary

A one-page overview of how the system works. Full detail in **WORKFLOW.md**.

---

## In one line
Cases move **Booking → Operations → Admin Review → Billing → Closed**, with each
role responsible for one stage, automatic emails at every hand-off, and a full
audit trail.

---

## The 5 roles
- **Booking** — registers patients and opens cases.
- **Operations** — captures the case data (registers) and pushes cases forward.
- **Billing** — invoices: submits and completes billing.
- **Admin** — reviews cases: approve, return, or close.
- **Owner** — full access to everything.

> Everyone can **view** all data; roles only control who can **change** it.

---

## The flow at a glance

| # | Stage | Done by | Result |
|---|-------|---------|--------|
| 1 | **Booking** | Booking | Patient + case created → *Booked / Operations* |
| 2 | **Operations** | Operations | Register fields captured → **Send to Admin Review** |
| 3 | **Admin Review** | Admin | **Approve → Billing**, **Return to Ops**, or **Close** |
| 4 | **Billing** | Billing | Pending → Submitted → Completed |
| 5 | **Closed** | Admin / Owner | Case closed |

Each step automatically updates the **status + stage**, writes the **audit log**,
and sends a **notification + email** to the relevant department and the owner.

---

## Key rules
- **Case types:** Inpatient · Outpatient · Laboratory (each has its own register).
- **Statuses:** Booked → In Progress → Admin Review → Billing → Closed.
- **Permissions:** create patient/case = Booking; operational edits + send-forward
  = Operations; billing = Billing; review/close/users/settings = Admin; Owner = all.
  Forbidden actions are refused, never silently dropped.
- **Emails:** recipients set in **Settings → Email Notifications** (owner + one per
  department). Requires the queue worker running (`php artisan queue:work`).
- **Registers:** Inpatient / Outpatient / Laboratory can be **Printed/PDF'd** or
  **Exported to Excel** in the branded MMA layout.

---

## Logins (test accounts — password `password`)
| Role | Email |
|------|-------|
| Booking | `booking@mma.test` |
| Operations | `operations@mma.test` |
| Billing | `billing@mma.test` |
| Admin | `admin@mma.test` |
| Owner | `owner@mma.test` |
