# Meridian Medical Assistance — How the System Works

This describes the roles, the users, and the end-to-end workflow a case follows
through the platform. It reflects exactly what the system enforces today.

---

## 1. What the system does

It manages the full lifecycle of a medical case — from the moment a patient is
booked, through operational data capture, admin review, and billing, to closure
— replacing the manual Excel registers. Every case is one of three types
(**Inpatient**, **Outpatient**, **Laboratory**) and moves through a fixed set of
workflow stages with role-based permissions, automatic notifications/emails, and
a complete audit trail.

---

## 2. Roles

There are five roles. Each user has exactly one role. **Owner** is a superset —
it can do everything every other role can do.

| Role | Who they are | What they do |
|------|--------------|--------------|
| **Booking** | Front desk / intake | Register patients, open new cases |
| **Operations** | Case handlers / coordinators | Capture operational data in the registers, move cases through Operations and on to Admin Review / Billing |
| **Billing** | Finance / invoicing | Update billing records, submit and complete billing |
| **Admin** | Reviewers / supervisors | Review cases, approve, return to operations, close cases |
| **Owner** | Management | Full access to every module, plus Users & Settings |

Everyone (any logged-in user) can **view** all data (dashboard, patients, cases,
registers, reports). Roles only restrict who can **change** things.

---

## 3. User accounts (seeded)

Default logins for testing — password is `password` for all of them:

| Role | Email |
|------|-------|
| Booking | `booking@mma.test` |
| Operations | `operations@mma.test` |
| Billing | `billing@mma.test`* |
| Admin | `admin@mma.test` |
| Owner | `owner@mma.test` |

\* The billing account was customised to a real address during testing. Use the
Owner login if you need full access. New users are created under **Users & Roles**
(Admin/Owner only).

---

## 4. Core concepts

A **case** is the central record. It always has:

- a **Patient** (one patient can have many cases)
- a **Case Type**: Inpatient · Outpatient · Laboratory
- a **Case Status**: Booked → In Progress → Admin Review → Billing → Closed
- a **Workflow Stage**: Operations → Admin Review → Billing → Closed
- a **Priority**: Low · Medium · High · Urgent
- a **type-specific detail record** (inpatient / outpatient / laboratory fields),
  created automatically when the case is created.

Status and Workflow Stage move together as the case is pushed along.

---

## 5. The workflow, stage by stage

```
  BOOKING            OPERATIONS              ADMIN REVIEW            BILLING            CLOSED
 ┌─────────┐        ┌─────────────┐         ┌──────────────┐       ┌──────────┐       ┌────────┐
 │ Create  │ ─────▶ │ Capture     │ ──────▶ │ Review &     │ ────▶ │ Invoice  │ ────▶ │ Closed │
 │ patient │        │ register    │        │ approve      │       │ & submit │       │        │
 │ + case  │        │ data        │ ◀────── │ (or return)  │       │          │       │        │
 └─────────┘        └─────────────┘  return └──────────────┘       └──────────┘       └────────┘
   Booking            Operations              Admin                  Billing          Admin/Owner
```

### Stage 0 — Booking (status: *Booked*, stage: *Operations*)
1. **Booking** registers the patient (**Patients → New Patient**) — the system
   prevents duplicates and validates the ID Number and MMA File Number.
2. **Booking** opens a case (**Cases → New Case**): pick the patient, case type,
   priority, and department. The matching detail record is created automatically.
3. The system sends a "new case" notification + email to the **Operations** team
   (or the **Laboratory** team for lab requests) and the **Owner**.

### Stage 1 — Operations (status: *In Progress*)
1. **Operations** works the case from its type register (**Inpatient Register**,
   **Outpatient Register**, or **Laboratory Requests**) or the case detail page,
   filling in the operational fields (admission/consult dates, follow-ups,
   medical-record requested/received, dates to admin, etc.).
2. **Send to Operations** marks the case *In Progress*.
3. When operational work is complete, **Send to Admin Review** moves it on.
   → notification + email to **Admin** and **Owner**.

### Stage 2 — Admin Review (status: *Admin Review*)
1. The case appears in the **Admin Review** queue.
2. **Admin** opens it and takes one of three actions, recording an
   **Admin Closure Date** and **Review Notes**:
   - **Approve** → forward the case (typically on to Billing).
   - **Return to Operations** → send it back for more work.
   - **Close** → finish the case here if no billing is needed.
3. Sending to billing → notification + email to **Billing** and **Owner**.

### Stage 3 — Billing (status: *Billing*)
1. When a case enters billing, a **pending billing record is created
   automatically**, so it shows immediately under **Billing → Pending Billing**.
2. **Billing** fills in the **Submission Date**, **Date Pastel**, and **Notes**,
   then moves the record **Pending → Submitted → Completed**.
3. Submitting / completing → billing notification + email.

### Stage 4 — Closed (status: *Closed*, stage: *Closed*)
- **Admin** or **Owner** closes the case (from the case detail page or Admin
  Review). → notification + email to the **Owner**.

---

## 6. Who can do what (permission matrix)

Owner can do everything; the table shows the *other* roles allowed for each action.

| Action | Allowed roles |
|--------|---------------|
| View anything (dashboard, lists, reports) | All roles |
| Create patient | Booking |
| Edit patient | Operations, Admin |
| Delete patient | Admin |
| Create case | Booking |
| Edit / delete case | Operations, Admin (delete: Admin only) |
| Edit register detail (inpatient/outpatient/lab) | Operations, Admin |
| Send to Operations | Operations, Admin |
| Send to Admin Review | Operations, Admin |
| Send to Billing | Operations, Admin, Billing |
| Close case | Admin |
| Admin review (approve / return / close) | Admin |
| Update billing | Billing |
| Upload document | Booking, Operations, Admin |
| Delete document | Operations, Admin |
| View audit logs | Admin |
| Manage users | Admin |
| Edit notification settings | Admin |

If a role tries an action it isn't allowed, the system refuses it (HTTP 403) —
it never silently fails.

---

## 7. The pages / modules

| Page | Purpose | Main users |
|------|---------|-----------|
| **Dashboard** | Totals, charts, recent cases, workflow alerts, filters | All |
| **Patients / Create Patient / Patient Profile** | Register, search, view and edit patients; see their cases & documents | Booking, Operations |
| **Cases / Create Case / Case Detail** | List, create, and drive cases through the workflow | Booking, Operations, Admin |
| **Inpatient Register** | Admissions/discharges + medical-record tracking | Operations |
| **Outpatient Register** | Consults, follow-ups, ongoing treatment | Operations |
| **Laboratory Requests** | Lab appointments, request types, invoicing | Operations |
| **Billing** | Pending / Submitted / History; update billing | Billing |
| **Admin Review** | Review queue; approve / return / close | Admin |
| **Documents** | Upload, link, preview and download documents | All (delete: Ops/Admin) |
| **Reports** | Cases by status/type, open by department, monthly trends, etc. | Admin, Owner |
| **Users & Roles** | Create/edit users and assign roles | Admin, Owner |
| **Settings** | Profile + **Email Notifications** (recipient addresses) | Admin/Owner for emails |

---

## 8. Case detail actions

On the case detail page the workflow buttons are: **Send to Operations**,
**Send to Admin Review**, **Send to Billing**, **Close Case**, and
**Upload Document**. Every one of these does three things atomically:

1. Updates the **Case Status** and **Workflow Stage**.
2. Writes an entry to the **Audit Log**.
3. Creates an in-app **Notification** and sends the relevant **email**.

---

## 9. Notifications & emails

- **In-app**: a bell in the top bar shows notifications (case sent to admin
  review, sent to billing, new lab request, document uploaded, case closed…).
- **Email**: configured under **Settings → Email Notifications** (Admin/Owner).
  You set an **Owner email** and one email **per department** (Operations, Admin,
  Billing, Laboratory), plus toggles for which events send mail. When a case
  enters a stage, that department's address is emailed — and the Owner if
  "owner receives all" is on.
- Emails are **queued** so case actions stay fast and a rate-limited send simply
  retries. This requires a worker running: `php artisan queue:work`.

---

## 10. Audit logging

Every status change, workflow move, document upload, billing update, admin
review, and login/logout is recorded with the user, the action, before/after
values, and a timestamp. Admin/Owner can view the full log; each case shows its
own audit trail on the detail page.

---

## 11. Registers, printing & exports

The Inpatient, Outpatient, and Laboratory registers each have:

- **Print / PDF** — opens the register in the branded MMA layout (logo, company
  name, Reg No, bordered table) and prints, or "Save as PDF".
- **Export Excel** — downloads a branded `.xlsx` in the same layout.

These reproduce the original Excel registers, populated live from the system.

---

## 12. Worked example (an inpatient case)

1. **Bridget (Booking)** registers patient *Thabo Mokoena*, then opens an
   **Inpatient** case → status *Booked*, stage *Operations*. Operations + Owner
   get an email.
2. **Oliver (Operations)** opens the **Inpatient Register**, records the
   admission date, marks *MR Requested*, later *MR Received*, sets *Date to
   Admin*, then clicks **Send to Admin Review** → Admin + Owner emailed.
3. **Adam (Admin)** reviews it in **Admin Review**, adds review notes and an
   admin closure date, and **approves → Send to Billing** → Billing + Owner
   emailed; a pending billing record appears.
4. **Bianca (Billing)** opens **Billing → Pending**, enters the submission date
   and Date Pastel, and marks it **Submitted**, then **Completed**.
5. **Adam (Admin)** or **Olivia (Owner)** **Closes** the case → status *Closed*.
6. At any point, anyone can **Print/PDF** or **Export Excel** the register, and
   the **audit trail** on the case shows every step and who did it.
