import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPaiseCompact, formatPaise } from "@/lib/money";
import { PageHeader, Stat, StatusBadge } from "@/components/ui";
import { RunButton } from "@/components/RunButton";
import { runAlertsAction, runBillingAction } from "@/app/actions";
import { INTERVAL_MONTHS, TRANSACTION_TYPE_LABELS, type Interval } from "@/lib/constants";
import { startOfMonth, subMonths, format, isSameMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();

  const [subs, openInvoices, pendingCount, payments, recentTx] = await Promise.all([
    prisma.subscription.findMany({ where: { status: "ACTIVE" } }),
    prisma.invoice.findMany({ where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } } }),
    prisma.transaction.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.payment.findMany({ where: { paidAt: { gte: startOfMonth(subMonths(now, 5)) } } }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { organization: true },
    }),
  ]);

  // MRR: normalize each active subscription to a monthly figure.
  const mrr = subs.reduce((s, sub) => s + Math.round(sub.amountPaise / INTERVAL_MONTHS[sub.interval as Interval]), 0);

  const outstanding = openInvoices.reduce((s, inv) => s + (inv.totalPaise - inv.amountPaidPaise), 0);
  const overdue = openInvoices
    .filter((inv) => inv.status === "OVERDUE")
    .reduce((s, inv) => s + (inv.totalPaise - inv.amountPaidPaise), 0);

  const revenueThisMonth = payments
    .filter((p) => isSameMonth(p.paidAt, now))
    .reduce((s, p) => s + p.amountPaise, 0);

  // Month-on-month revenue for the last 6 months.
  const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
  const monthly = months.map((m) => ({
    label: format(m, "MMM"),
    total: payments.filter((p) => isSameMonth(p.paidAt, m)).reduce((s, p) => s + p.amountPaise, 0),
  }));
  const maxMonth = Math.max(1, ...monthly.map((m) => m.total));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Everything across your organizations · ${format(now, "MMMM yyyy")}`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="MRR (recurring / mo)" value={formatPaiseCompact(mrr)} hint={`${subs.length} active subscriptions`} tone="success" href="/subscriptions" />
        <Stat label="Collected this month" value={formatPaiseCompact(revenueThisMonth)} hint={format(now, "MMMM yyyy")} />
        <Stat label="Outstanding" value={formatPaiseCompact(outstanding)} hint={`${openInvoices.length} open invoices`} tone="warning" href="/invoices" />
        <Stat label="Overdue" value={formatPaiseCompact(overdue)} hint="past due date" tone={overdue > 0 ? "danger" : "default"} href="/invoices?status=OVERDUE" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Month-on-month chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">Revenue collected — last 6 months</h2>
          <div className="mt-6 flex h-48 items-end gap-4">
            {monthly.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-brand-500 transition-all"
                    style={{ height: `${Math.max(4, (m.total / maxMonth) * 100)}%` }}
                    title={formatPaise(m.total)}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600">{m.label}</span>
                <span className="text-[11px] text-gray-400">{formatPaiseCompact(m.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action center */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900">Action center</h2>
          <div className="mt-4 space-y-4">
            <Link href="/transactions?status=PENDING_APPROVAL" className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
              <span className="text-sm font-medium text-amber-900">Pending approvals</span>
              <span className="badge bg-amber-200 text-amber-900">{pendingCount}</span>
            </Link>

            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">Run recurring billing</p>
              <RunButton
                action={runBillingAction}
                label="Raise due subscription charges"
                className="btn-secondary w-full"
              />
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">Check deadlines & email alerts</p>
              <RunButton
                action={runAlertsAction}
                label="Run alerts now"
                className="btn-primary w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent transactions</h2>
          <Link href="/transactions" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all →</Link>
        </div>
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="th">Organization</th>
              <th className="th">Type</th>
              <th className="th">Description</th>
              <th className="th text-right">Amount</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recentTx.map((t) => (
              <tr key={t.id}>
                <td className="td font-medium text-gray-900">{t.organization.name}</td>
                <td className="td">{TRANSACTION_TYPE_LABELS[t.type as keyof typeof TRANSACTION_TYPE_LABELS]}</td>
                <td className="td">{t.description}</td>
                <td className="td text-right tabular-nums">{formatPaise(t.amountPaise)}</td>
                <td className="td"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
