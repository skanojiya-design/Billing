import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from "@/lib/constants";
import { format, differenceInCalendarDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }: { searchParams: { status?: string } }) {
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { issueDate: "desc" },
    include: { organization: true },
  });

  const today = new Date();

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Billing documents, due dates and payment status" />

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip label="All" href="/invoices" active={!searchParams.status} />
        {INVOICE_STATUSES.map((s) => (
          <Chip key={s} label={INVOICE_STATUS_LABELS[s]} href={`/invoices?status=${s}`} active={searchParams.status === s} />
        ))}
      </div>

      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" hint="Invoices are created from approved transactions." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">Invoice</th>
                <th className="th">Organization</th>
                <th className="th">Issued</th>
                <th className="th">Due</th>
                <th className="th text-right">Total</th>
                <th className="th text-right">Outstanding</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => {
                const outstanding = inv.totalPaise - inv.amountPaidPaise;
                const daysLate = differenceInCalendarDays(today, inv.dueDate);
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="td">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-600 hover:underline">{inv.number}</Link>
                    </td>
                    <td className="td text-gray-900">{inv.organization.name}</td>
                    <td className="td text-gray-500">{format(inv.issueDate, "d MMM yyyy")}</td>
                    <td className="td text-gray-500">
                      {format(inv.dueDate, "d MMM yyyy")}
                      {inv.status !== "PAID" && daysLate > 0 && (
                        <span className="ml-1 text-xs font-medium text-red-600">({daysLate}d late)</span>
                      )}
                    </td>
                    <td className="td text-right tabular-nums">{formatPaise(inv.totalPaise)}</td>
                    <td className="td text-right tabular-nums">{outstanding > 0 ? formatPaise(outstanding) : "—"}</td>
                    <td className="td"><StatusBadge status={inv.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Chip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
