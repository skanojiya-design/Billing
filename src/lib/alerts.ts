import { prisma } from "./db";
import { queueEmail } from "./email";
import { formatPaise } from "./money";
import { format, differenceInCalendarDays } from "date-fns";

// The alert engine. Run it on a schedule (see scripts/run-alerts.ts) or on
// demand from the dashboard. It:
//   1. Marks unpaid, past-due invoices as OVERDUE.
//   2. Queues a "due soon" reminder for invoices due within ALERT_DUE_SOON_DAYS.
//   3. Queues an "overdue" reminder for invoices past their due date.
// It never queues the same reminder twice for the same invoice+day.

function dueSoonWindow(): number {
  const n = Number(process.env.ALERT_DUE_SOON_DAYS ?? "5");
  return Number.isFinite(n) && n > 0 ? n : 5;
}

async function alreadyQueuedToday(invoiceId: string, type: string): Promise<boolean> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const existing = await prisma.emailOutbox.findFirst({
    where: { invoiceId, type, createdAt: { gte: startOfToday } },
  });
  return existing !== null;
}

export type AlertRunResult = {
  markedOverdue: number;
  dueSoonQueued: number;
  overdueQueued: number;
};

export async function runAlerts(): Promise<AlertRunResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowDays = dueSoonWindow();

  const result: AlertRunResult = { markedOverdue: 0, dueSoonQueued: 0, overdueQueued: 0 };

  // Consider invoices that still owe money.
  const openInvoices = await prisma.invoice.findMany({
    where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
    include: { organization: true },
  });

  for (const inv of openInvoices) {
    const daysUntilDue = differenceInCalendarDays(inv.dueDate, today);
    const outstanding = inv.totalPaise - inv.amountPaidPaise;
    if (outstanding <= 0) continue;

    if (daysUntilDue < 0) {
      // Past due — flip to OVERDUE and remind.
      if (inv.status !== "OVERDUE") {
        await prisma.invoice.update({ where: { id: inv.id }, data: { status: "OVERDUE" } });
        // keep the linked transaction in sync
        if (inv.transactionId) {
          await prisma.transaction.update({
            where: { id: inv.transactionId },
            data: { status: "OVERDUE" },
          });
        }
        result.markedOverdue++;
      }
      if (!(await alreadyQueuedToday(inv.id, "OVERDUE"))) {
        await queueEmail({
          toEmail: inv.organization.contactEmail,
          toName: inv.organization.contactName,
          type: "OVERDUE",
          invoiceId: inv.id,
          subject: `OVERDUE: Invoice ${inv.number} — ${formatPaise(outstanding)} due`,
          body: overdueBody(inv.number, inv.organization.name, outstanding, inv.dueDate, -daysUntilDue),
        });
        result.overdueQueued++;
      }
    } else if (daysUntilDue <= windowDays) {
      // Coming due soon — gentle reminder.
      if (!(await alreadyQueuedToday(inv.id, "DUE_SOON"))) {
        await queueEmail({
          toEmail: inv.organization.contactEmail,
          toName: inv.organization.contactName,
          type: "DUE_SOON",
          invoiceId: inv.id,
          subject: `Reminder: Invoice ${inv.number} due ${format(inv.dueDate, "d MMM yyyy")}`,
          body: dueSoonBody(inv.number, inv.organization.name, outstanding, inv.dueDate, daysUntilDue),
        });
        result.dueSoonQueued++;
      }
    }
  }

  return result;
}

function dueSoonBody(number: string, org: string, amount: number, dueDate: Date, days: number): string {
  const when = days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`;
  return [
    `Hi ${org},`,
    ``,
    `This is a friendly reminder that invoice ${number} for ${formatPaise(amount)} is due ${when} (${format(dueDate, "d MMM yyyy")}).`,
    ``,
    `Please arrange payment before the due date to avoid any interruption.`,
    ``,
    `Thank you,`,
    `roqit Billing`,
  ].join("\n");
}

function overdueBody(number: string, org: string, amount: number, dueDate: Date, daysLate: number): string {
  return [
    `Hi ${org},`,
    ``,
    `Invoice ${number} for ${formatPaise(amount)} was due on ${format(dueDate, "d MMM yyyy")} and is now ${daysLate} day${daysLate === 1 ? "" : "s"} overdue.`,
    ``,
    `Please make the payment at the earliest. If you have already paid, kindly ignore this message.`,
    ``,
    `Thank you,`,
    `roqit Billing`,
  ].join("\n");
}
