import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { PageHeader, StatusBadge, Stat } from "@/components/ui";
import { TRANSACTION_TYPE_LABELS, INTERVAL_LABELS } from "@/lib/constants";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function OrganizationDetailPage({ params }: { params: { id: string } }) {
  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      subscriptions: { include: { plan: true } },
      transactions: { orderBy: { createdAt: "desc" }, take: 10 },
      invoices: { orderBy: { issueDate: "desc" } },
    },
  });
  if (!org) notFound();

  const totalBilled = org.invoices.reduce((s, i) => s + i.totalPaise, 0);
  const collected = org.invoices.reduce((s, i) => s + i.amountPaidPaise, 0);
  const outstanding = totalBilled - collected;

  return (
    <div>
      <PageHeader
        title={org.name}
        subtitle={org.contactEmail}
        action={<StatusBadge status={org.status} />}
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total billed" value={formatPaise(totalBilled)} />
        <Stat label="Collected" value={formatPaise(collected)} tone="success" />
        <Stat label="Outstanding" value={formatPaise(outstanding)} tone={outstanding > 0 ? "warning" : "default"} />
      </div>

      {/* Contact card */}
      <div className="card mt-6 grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
        <Field label="Contact" value={org.contactName || "—"} />
        <Field label="Phone" value={org.phone || "—"} />
        <Field label="GSTIN" value={org.gstin || "—"} />
        <Field label="Currency" value={org.currency} />
        {org.billingAddress && <div className="col-span-2 sm:col-span-4"><Field label="Address" value={org.billingAddress} /></div>}
        {org.notes && <div className="col-span-2 sm:col-span-4"><Field label="Notes" value={org.notes} /></div>}
      </div>

      {/* Subscriptions */}
      <Section title="Subscriptions" action={<Link href="/subscriptions/new" className="text-sm font-medium text-brand-600">+ Add</Link>}>
        {org.subscriptions.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">No subscriptions.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {org.subscriptions.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium text-gray-900">{s.plan.name}</span>
                <span className="text-gray-500">{formatPaise(s.amountPaise)} / {INTERVAL_LABELS[s.interval as keyof typeof INTERVAL_LABELS]}</span>
                <span className="text-gray-500">Next: {format(s.nextBillingDate, "d MMM yyyy")}</span>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recent transactions */}
      <Section title="Recent transactions" action={<Link href="/transactions/new" className="text-sm font-medium text-brand-600">+ Add</Link>}>
        {org.transactions.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">No transactions.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {org.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <Link href={`/transactions/${t.id}`} className="text-brand-600 hover:underline">{t.description}</Link>
                <span className="text-xs text-gray-400">{TRANSACTION_TYPE_LABELS[t.type as keyof typeof TRANSACTION_TYPE_LABELS]}</span>
                <span className="tabular-nums text-gray-700">{formatPaise(t.amountPaise)}</span>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Invoices */}
      <Section title="Invoices">
        {org.invoices.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">No invoices.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {org.invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <Link href={`/invoices/${i.id}`} className="font-medium text-brand-600 hover:underline">{i.number}</Link>
                <span className="text-gray-500">Due {format(i.dueDate, "d MMM yyyy")}</span>
                <span className="tabular-nums text-gray-700">{formatPaise(i.totalPaise)}</span>
                <StatusBadge status={i.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Link href="/organizations" className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-700">← All organizations</Link>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-gray-900">{value}</p>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
