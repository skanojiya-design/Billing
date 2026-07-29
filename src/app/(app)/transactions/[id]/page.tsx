import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, canApprove, canEdit } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import { PageHeader, StatusBadge } from "@/components/ui";
import {
  submitForApproval,
  approveTransaction,
  rejectTransaction,
  createInvoice,
} from "@/app/actions";
import { TRANSACTION_TYPE_LABELS } from "@/lib/constants";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  const t = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { organization: true, invoice: true, createdBy: true, approvedBy: true, subscription: { include: { plan: true } } },
  });
  if (!t) notFound();

  const editable = user && canEdit(user.role);
  const approver = user && canApprove(user.role);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t.description}
        subtitle={`${TRANSACTION_TYPE_LABELS[t.type as keyof typeof TRANSACTION_TYPE_LABELS]} · ${t.organization.name}`}
        action={<StatusBadge status={t.status} />}
      />

      <div className="card divide-y divide-gray-100">
        <Row label="Organization"><Link href={`/organizations/${t.organizationId}`} className="text-brand-600 hover:underline">{t.organization.name}</Link></Row>
        <Row label="Amount (before tax)"><span className="font-semibold">{formatPaise(t.amountPaise)}</span></Row>
        <Row label="Due date">{t.dueDate ? format(t.dueDate, "d MMM yyyy") : "—"}</Row>
        <Row label="Created by">{t.createdBy.name} · {format(t.createdAt, "d MMM yyyy")}</Row>
        {t.approvedBy && <Row label="Approved by">{t.approvedBy.name} · {t.approvedAt ? format(t.approvedAt, "d MMM yyyy") : ""}</Row>}
        {t.rejectedReason && <Row label="Rejection reason"><span className="text-red-600">{t.rejectedReason}</span></Row>}
        {t.subscription && <Row label="From subscription">{t.subscription.plan.name}</Row>}
        {t.invoice && (
          <Row label="Invoice">
            <Link href={`/invoices/${t.invoice.id}`} className="text-brand-600 hover:underline">{t.invoice.number}</Link>
          </Row>
        )}
      </div>

      {/* Workflow actions */}
      <div className="mt-6 space-y-4">
        {t.status === "DRAFT" && editable && (
          <form action={submitForApproval} className="card p-5">
            <input type="hidden" name="id" value={t.id} />
            <p className="mb-3 text-sm text-gray-600">This transaction is a draft. Submit it for approval.</p>
            <button className="btn-primary">Submit for approval</button>
          </form>
        )}

        {t.status === "PENDING_APPROVAL" && (
          <div className="card p-5">
            <p className="mb-3 text-sm text-gray-600">
              {approver ? "Review this transaction." : "Awaiting approval from an approver or admin."}
            </p>
            {approver && (
              <div className="flex flex-wrap items-end gap-3">
                <form action={approveTransaction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="btn-success">Approve</button>
                </form>
                <form action={rejectTransaction} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <div>
                    <label className="label">Reason (optional)</label>
                    <input name="reason" className="input" placeholder="Why rejected?" />
                  </div>
                  <button className="btn-danger">Reject</button>
                </form>
              </div>
            )}
          </div>
        )}

        {t.status === "APPROVED" && editable && !t.invoice && (
          <form action={createInvoice} className="card p-5">
            <input type="hidden" name="transactionId" value={t.id} />
            <h3 className="text-sm font-semibold text-gray-900">Generate invoice</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="label">GST / tax rate (%)</label>
                <input name="taxRatePct" type="number" step="0.01" defaultValue={18} className="input" />
              </div>
              <div>
                <label className="label">Payment due in (days)</label>
                <input name="dueInDays" type="number" defaultValue={15} className="input" />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Notes (optional)</label>
              <input name="notes" className="input" placeholder="Appears on the invoice" />
            </div>
            <button className="btn-primary mt-4">Generate invoice</button>
          </form>
        )}
      </div>

      <Link href="/transactions" className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-700">← Back to transactions</Link>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{children}</span>
    </div>
  );
}
