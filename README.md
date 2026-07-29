# roqit Billing

One internal app to run the whole money side of roqit — **without** an ops team.

It tracks every kind of charge (subscriptions, pay-as-you-go, one-time), routes
them through an approval step, turns approved charges into GST invoices, watches
due dates, and automatically emails **"due soon"** and **"overdue"** reminders.
Everything rolls up per **organization** and is viewable **month-on-month**.

> This is a **record-keeping ledger**, not a payment gateway. No money moves
> through the app. Your team records what happened elsewhere (invoice raised,
> payment received, approval given) and the app keeps it all organized and
> chases deadlines for you. Payments and email are **simulated** for now and are
> designed to be swapped for Razorpay/Stripe + SendGrid/SES later.

---

## What it does

| Area | What you can do |
|------|-----------------|
| **Dashboard** | MRR, collected this month, outstanding, overdue, pending approvals, a 6-month revenue chart, and one-click "run billing / run alerts". |
| **Organizations** | Every account. Contact, GSTIN, address. Each org shows its subscriptions, transactions, invoices, total billed / collected / outstanding. |
| **Transactions** | Record a `SUBSCRIPTION`, `PAY_AS_YOU_GO`, or `ONE_TIME` charge. Flows through `DRAFT → PENDING_APPROVAL → APPROVED → INVOICED → PAID` (or `REJECTED` / `OVERDUE`). |
| **Approvals** | Approvers/Admins approve or reject pending transactions. |
| **Invoices** | Auto-numbered (`ROQ-2026-0001`), GST tax, due date, printable document. Record (manual) payments; status updates automatically. |
| **Subscriptions & Plans** | Reusable plans (monthly/quarterly/yearly). Subscribe an org; next-billing date is tracked. "Run billing" raises charges that are due. |
| **Alerts & Email** | The engine flips past-due invoices to `OVERDUE`, emails a reminder N days before the due date, and chases overdue invoices. All emails land in a visible outbox. |
| **Roles** | `ADMIN`, `APPROVER`, `VIEWER`. |

## Tech

- **Next.js 14** (App Router, TypeScript) — one app, frontend + backend together
- **Prisma + SQLite** — a local file database, zero setup (swap `DATABASE_URL` for Postgres later)
- **Tailwind CSS**
- Cookie-based session auth (`jose` + `bcryptjs`)

## Getting started

```bash
npm install
cp .env.example .env      # then edit AUTH_SECRET
npm run setup             # generate client + create DB + seed demo data
npm run dev               # http://localhost:3000
```

### Demo logins (created by the seed)

| Email | Password | Role |
|-------|----------|------|
| `admin@roqit.com` | `password123` | Admin |
| `approver@roqit.com` | `password123` | Approver |
| `viewer@roqit.com` | `password123` | Viewer |

## Running the alerts / billing automation

The reminder engine can run on demand from the **Dashboard** or **Alerts** page,
or headless on a schedule:

```bash
npm run alerts:run        # mark overdue, queue reminders, "send" the outbox
```

Or hit the HTTP endpoint from any external scheduler (cron, GitHub Action, Vercel Cron):

```
GET /api/cron/run-alerts?key=<CRON_SECRET>
```

Set `CRON_SECRET` in the environment to require the key (leave unset for local dev).
Tune how early reminders go out with `ALERT_DUE_SOON_DAYS` (default 5).

## Useful scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run setup` | Generate Prisma client, create DB, seed |
| `npm run db:reset` | Wipe & re-seed the database |
| `npm run db:studio` | Open Prisma Studio to browse data |
| `npm run alerts:run` | Run the alert/reminder engine once |

## Going live later (the swap-in points)

Nothing in the app assumes simulation — two small files are the seams:

1. **Email** — `src/lib/email.ts`, function `deliver()`. Replace the no-op with a
   real transport (SendGrid/SES/SMTP). Queueing and the outbox stay as-is.
2. **Payments** — today payments are recorded manually. To accept real payments,
   add a gateway (Razorpay/Stripe) and call `recordPayment` / `recomputeInvoiceStatus`
   from its webhook instead of the form.
3. **Database** — change the `provider` in `prisma/schema.prisma` to `postgresql`
   and point `DATABASE_URL` at Postgres. Enum-like values already live in
   `src/lib/constants.ts`.
