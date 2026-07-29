import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { RunButton } from "@/components/RunButton";
import { runAlertsAction } from "@/app/actions";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  DUE_SOON: "Due soon",
  OVERDUE: "Overdue",
  INVOICE_SENT: "Invoice sent",
  APPROVAL_REQUEST: "Approval",
  GENERIC: "Notice",
};

export default async function AlertsPage() {
  const dueSoonDays = process.env.ALERT_DUE_SOON_DAYS ?? "5";
  const emails = await prisma.emailOutbox.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { invoice: true },
  });
  const queued = emails.filter((e) => e.status === "QUEUED").length;

  return (
    <div>
      <PageHeader
        title="Alerts & Email"
        subtitle="Automatic reminders for upcoming and overdue payments"
      />

      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-700">
              The alert engine marks overdue invoices, emails a <strong>reminder {dueSoonDays} days before</strong> a due date,
              and chases <strong>overdue</strong> invoices. {queued > 0 ? `${queued} message(s) waiting to send.` : "Outbox is clear."}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Emails are simulated (stored below). Run automatically via <code>npm run alerts:run</code> on a schedule, or here.
            </p>
          </div>
          <RunButton action={runAlertsAction} label="Run alerts now" />
        </div>
      </div>

      {emails.length === 0 ? (
        <EmptyState title="No emails yet" hint="Run the alert engine or send an invoice to populate the outbox." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">When</th>
                <th className="th">Type</th>
                <th className="th">To</th>
                <th className="th">Subject</th>
                <th className="th">Invoice</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {emails.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="td whitespace-nowrap text-gray-500">{format(e.createdAt, "d MMM, HH:mm")}</td>
                  <td className="td">{TYPE_LABEL[e.type] ?? e.type}</td>
                  <td className="td">{e.toName ? `${e.toName}` : e.toEmail}<span className="block text-xs text-gray-400">{e.toEmail}</span></td>
                  <td className="td max-w-xs truncate" title={e.subject}>{e.subject}</td>
                  <td className="td">
                    {e.invoice ? <Link href={`/invoices/${e.invoice.id}`} className="text-brand-600 hover:underline">{e.invoice.number}</Link> : "—"}
                  </td>
                  <td className="td"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
