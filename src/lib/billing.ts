import { prisma } from "./db";
import { addMonths } from "date-fns";
import { INTERVAL_MONTHS, type Interval } from "./constants";

// Generate the next invoice number like ROQ-2026-0007 (sequential within a year).
export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ROQ-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  let seq = 1;
  if (last) {
    const n = parseInt(last.number.slice(prefix.length), 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export function computeTax(subtotalPaise: number, taxRatePct: number) {
  const taxPaise = Math.round((subtotalPaise * taxRatePct) / 100);
  return { taxPaise, totalPaise: subtotalPaise + taxPaise };
}

type GenerateArgs = {
  transactionId: string;
  taxRatePct?: number;
  dueDate: Date;
  notes?: string;
};

/**
 * Create an invoice from an APPROVED transaction. Marks the transaction as
 * INVOICED. Returns the created invoice.
 */
export async function generateInvoiceFromTransaction(args: GenerateArgs) {
  const tx = await prisma.transaction.findUnique({
    where: { id: args.transactionId },
    include: { organization: true, invoice: true },
  });
  if (!tx) throw new Error("Transaction not found");
  if (tx.invoice) throw new Error("An invoice already exists for this transaction");
  if (tx.status !== "APPROVED") throw new Error("Only approved transactions can be invoiced");

  const taxRatePct = args.taxRatePct ?? 18;
  const subtotalPaise = tx.amountPaise;
  const { taxPaise, totalPaise } = computeTax(subtotalPaise, taxRatePct);
  const number = await nextInvoiceNumber();

  const invoice = await prisma.$transaction(async (db) => {
    const created = await db.invoice.create({
      data: {
        number,
        organizationId: tx.organizationId,
        transactionId: tx.id,
        status: "DRAFT",
        issueDate: new Date(),
        dueDate: args.dueDate,
        subtotalPaise,
        taxRatePct,
        taxPaise,
        totalPaise,
        notes: args.notes,
        lineItems: {
          create: [
            {
              description: tx.description,
              quantity: 1,
              unitAmountPaise: subtotalPaise,
              amountPaise: subtotalPaise,
            },
          ],
        },
      },
    });
    await db.transaction.update({ where: { id: tx.id }, data: { status: "INVOICED" } });
    return created;
  });

  return invoice;
}

/** Recompute an invoice's status from its recorded payments. */
export async function recomputeInvoiceStatus(invoiceId: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true, transaction: true },
  });
  if (!inv) return;
  const paid = inv.payments.reduce((s, p) => s + p.amountPaise, 0);

  let status = inv.status;
  if (paid >= inv.totalPaise) status = "PAID";
  else if (paid > 0) status = "PARTIALLY_PAID";
  else if (inv.dueDate < new Date()) status = "OVERDUE";
  else if (inv.status === "DRAFT") status = "DRAFT";
  else status = "SENT";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaidPaise: paid, status },
  });

  // Keep the linked transaction in sync.
  if (inv.transactionId) {
    let txStatus = "INVOICED";
    if (status === "PAID") txStatus = "PAID";
    else if (status === "OVERDUE") txStatus = "OVERDUE";
    await prisma.transaction.update({
      where: { id: inv.transactionId },
      data: { status: txStatus, paidAt: status === "PAID" ? new Date() : null },
    });
  }
}

export function advanceBillingDate(from: Date, interval: Interval): Date {
  return addMonths(from, INTERVAL_MONTHS[interval]);
}

/**
 * For every ACTIVE subscription whose nextBillingDate has arrived, create a
 * PENDING_APPROVAL transaction and roll the billing date forward. Returns the
 * number of transactions raised.
 */
export async function runSubscriptionBilling(actorUserId: string): Promise<number> {
  const now = new Date();
  const due = await prisma.subscription.findMany({
    where: { status: "ACTIVE", nextBillingDate: { lte: now } },
    include: { plan: true, organization: true },
  });

  let raised = 0;
  for (const sub of due) {
    await prisma.$transaction(async (db) => {
      await db.transaction.create({
        data: {
          organizationId: sub.organizationId,
          type: "SUBSCRIPTION",
          description: `${sub.plan.name} — ${sub.interval.toLowerCase()} subscription`,
          amountPaise: sub.amountPaise,
          status: "PENDING_APPROVAL",
          subscriptionId: sub.id,
          createdById: actorUserId,
          dueDate: advanceBillingDate(sub.nextBillingDate, sub.interval as Interval),
        },
      });
      await db.subscription.update({
        where: { id: sub.id },
        data: { nextBillingDate: advanceBillingDate(sub.nextBillingDate, sub.interval as Interval) },
      });
    });
    raised++;
  }
  return raised;
}
