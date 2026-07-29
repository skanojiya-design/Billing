import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser, canApprove } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { approveTransaction, rejectTransaction, submitForApproval } from "@/app/actions";
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_LABELS,
} from "@/lib/constants";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string };
}) {
  const user = await getSessionUser();
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.type) where.type = searchParams.type;

  const txns = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { organization: true, invoice: true },
  });

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle="Every subscription, pay-as-you-go and one-time charge"
        action={
          <Link href="/transactions/new" className="btn-primary">+ New transaction</Link>
        }
      />

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip label="All" href="/transactions" active={!searchParams.status} />
        {TRANSACTION_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={TRANSACTION_STATUS_LABELS[s]}
            href={`/transactions?status=${s}`}
            active={searchParams.status === s}
          />
        ))}
      </div>

      {txns.length === 0 ? (
        <EmptyState title="No transactions found" hint="Create one to get started." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">Organization</th>
                <th className="th">Type</th>
                <th className="th">Description</th>
                <th className="th">Due</th>
                <th className="th text-right">Amount</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {txns.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="td font-medium text-gray-900">{t.organization.name}</td>
                  <td className="td">{TRANSACTION_TYPE_LABELS[t.type as keyof typeof TRANSACTION_TYPE_LABELS]}</td>
                  <td className="td">
                    <Link href={`/transactions/${t.id}`} className="text-brand-600 hover:underline">
                      {t.description}
                    </Link>
                  </td>
                  <td className="td text-gray-500">{t.dueDate ? format(t.dueDate, "d MMM yyyy") : "—"}</td>
                  <td className="td text-right tabular-nums">{formatPaise(t.amountPaise)}</td>
                  <td className="td"><StatusBadge status={t.status} /></td>
                  <td className="td">
                    <div className="flex justify-end gap-1.5">
                      {t.status === "DRAFT" && (
                        <form action={submitForApproval}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className="btn-secondary px-2.5 py-1 text-xs">Submit</button>
                        </form>
                      )}
                      {t.status === "PENDING_APPROVAL" && user && canApprove(user.role) && (
                        <>
                          <form action={approveTransaction}>
                            <input type="hidden" name="id" value={t.id} />
                            <button className="btn-success px-2.5 py-1 text-xs">Approve</button>
                          </form>
                          <form action={rejectTransaction}>
                            <input type="hidden" name="id" value={t.id} />
                            <button className="btn-danger px-2.5 py-1 text-xs">Reject</button>
                          </form>
                        </>
                      )}
                      {t.status === "APPROVED" && (
                        <Link href={`/transactions/${t.id}`} className="btn-primary px-2.5 py-1 text-xs">
                          Invoice
                        </Link>
                      )}
                      {t.invoice && (
                        <Link href={`/invoices/${t.invoice.id}`} className="btn-secondary px-2.5 py-1 text-xs">
                          {t.invoice.number}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
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
