import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, canEdit } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import { StatusBadge } from "@/components/ui";
import { sendInvoice, recordPayment } from "@/app/actions";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  const inv = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { organization: true, lineItems: true, payments: { orderBy: { paidAt: "desc" } } },
  });
  if (!inv) notFound();

  const outstanding = inv.totalPaise - inv.amountPaidPaise;
  const editable = user && canEdit(user.role);

  return (
    <div className="max-w-3xl">
      {/* Toolbar (hidden when printing) */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="text-sm text-gray-500 hover:text-gray-700">← Invoices</Link>
          <StatusBadge status={inv.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && inv.status === "DRAFT" && (
            <form action={sendInvoice}>
              <input type="hidden" name="id" value={inv.id} />
              <button className="btn-primary">Mark as sent & email</button>
            </form>
          )}
        </div>
      </div>

      {/* The invoice document */}
      <div className="card p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-base font-bold text-white">r</span>
              <span className="text-lg font-semibold">roqit</span>
            </div>
            <p className="mt-3 text-xs text-gray-500">roqit Technologies Pvt Ltd</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight">INVOICE</h1>
            <p className="mt-1 text-sm font-medium text-gray-900">{inv.number}</p>
            <p className="mt-2 text-xs text-gray-500">Issued: {format(inv.issueDate, "d MMM yyyy")}</p>
            <p className="text-xs text-gray-500">Due: {format(inv.dueDate, "d MMM yyyy")}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bill to</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{inv.organization.name}</p>
            {inv.organization.contactName && <p className="text-sm text-gray-600">{inv.organization.contactName}</p>}
            <p className="text-sm text-gray-600">{inv.organization.contactEmail}</p>
            {inv.organization.billingAddress && <p className="mt-1 text-sm text-gray-500">{inv.organization.billingAddress}</p>}
            {inv.organization.gstin && <p className="mt-1 text-xs text-gray-500">GSTIN: {inv.organization.gstin}</p>}
          </div>
        </div>

        <table className="mt-8 w-full">
          <thead className="border-b-2 border-gray-200">
            <tr>
              <th className="py-2 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-gray-500">Qty</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-gray-500">Unit</th>
              <th className="py-2 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inv.lineItems.map((li) => (
              <tr key={li.id}>
                <td className="py-3 text-sm text-gray-900">{li.description}</td>
                <td className="py-3 text-right text-sm tabular-nums text-gray-600">{li.quantity}</td>
                <td className="py-3 text-right text-sm tabular-nums text-gray-600">{formatPaise(li.unitAmountPaise)}</td>
                <td className="py-3 text-right text-sm tabular-nums text-gray-900">{formatPaise(li.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-2">
            <Line label="Subtotal" value={formatPaise(inv.subtotalPaise)} />
            <Line label={`GST (${inv.taxRatePct}%)`} value={formatPaise(inv.taxPaise)} />
            <div className="border-t border-gray-200 pt-2">
              <Line label="Total" value={formatPaise(inv.totalPaise)} bold />
            </div>
            {inv.amountPaidPaise > 0 && <Line label="Paid" value={`− ${formatPaise(inv.amountPaidPaise)}`} />}
            {outstanding > 0 && <Line label="Amount due" value={formatPaise(outstanding)} bold />}
          </div>
        </div>

        {inv.notes && <p className="mt-8 border-t border-gray-100 pt-4 text-sm text-gray-500">{inv.notes}</p>}
      </div>

      {/* Payments */}
      <div className="no-print mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900">Payments recorded</h3>
          {inv.payments.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No payments recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {inv.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {format(p.paidAt, "d MMM yyyy")} · {PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS]}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  <span className="font-medium tabular-nums">{formatPaise(p.amountPaise)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {editable && outstanding > 0 && inv.status !== "DRAFT" && (
          <form action={recordPayment} className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900">Record a payment</h3>
            <input type="hidden" name="invoiceId" value={inv.id} />
            <div className="mt-3 space-y-3">
              <div>
                <label className="label">Amount (₹)</label>
                <input name="amountRupees" type="number" step="0.01" min="0" defaultValue={(outstanding / 100).toFixed(2)} className="input" required />
              </div>
              <div>
                <label className="label">Method</label>
                <select name="method" className="input">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Reference (UTR / txn id)</label>
                <input name="reference" className="input" placeholder="optional" />
              </div>
              <button className="btn-success w-full">Record payment</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? "font-semibold text-gray-900" : "text-gray-500"}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>{value}</span>
    </div>
  );
}
