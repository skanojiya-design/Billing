"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, canApprove, canEdit } from "@/lib/auth";
import { rupeesToPaise } from "@/lib/money";
import {
  generateInvoiceFromTransaction,
  recomputeInvoiceStatus,
  runSubscriptionBilling,
  advanceBillingDate,
} from "@/lib/billing";
import { runAlerts } from "@/lib/alerts";
import { flushOutbox, queueEmail } from "@/lib/email";
import { formatPaise } from "@/lib/money";
import { addDays } from "date-fns";
import type { Interval } from "@/lib/constants";

async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

async function audit(actorId: string, action: string, entity: string, entityId?: string, detail?: string) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId, detail } });
}

// --------------------------------------------------------------------------
// Organizations
// --------------------------------------------------------------------------
const orgSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  contactEmail: z.string().email(),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
});

export async function createOrganization(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("You do not have permission to do this.");
  const data = orgSchema.parse(Object.fromEntries(formData));
  const org = await prisma.organization.create({ data });
  await audit(user.id, "create", "Organization", org.id, org.name);
  revalidatePath("/organizations");
  redirect(`/organizations/${org.id}`);
}

// --------------------------------------------------------------------------
// Transactions
// --------------------------------------------------------------------------
const txSchema = z.object({
  organizationId: z.string().min(1),
  type: z.enum(["SUBSCRIPTION", "PAY_AS_YOU_GO", "ONE_TIME"]),
  description: z.string().min(1),
  amountRupees: z.coerce.number().positive(),
  dueDate: z.string().optional(),
  submit: z.string().optional(), // "1" to submit for approval immediately
});

export async function createTransaction(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("You do not have permission to do this.");
  const raw = Object.fromEntries(formData);
  const data = txSchema.parse(raw);
  const tx = await prisma.transaction.create({
    data: {
      organizationId: data.organizationId,
      type: data.type,
      description: data.description,
      amountPaise: rupeesToPaise(data.amountRupees),
      status: data.submit === "1" ? "PENDING_APPROVAL" : "DRAFT",
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      createdById: user.id,
    },
  });
  await audit(user.id, "create", "Transaction", tx.id, `${data.type} ${formatPaise(tx.amountPaise)}`);
  revalidatePath("/transactions");
  redirect(`/transactions`);
}

export async function submitForApproval(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.transaction.update({ where: { id }, data: { status: "PENDING_APPROVAL" } });
  await audit(user.id, "submit", "Transaction", id);
  revalidatePath("/transactions");
}

export async function approveTransaction(formData: FormData) {
  const user = await requireUser();
  if (!canApprove(user.role)) throw new Error("Only approvers or admins can approve.");
  const id = String(formData.get("id"));
  await prisma.transaction.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() },
  });
  await audit(user.id, "approve", "Transaction", id);
  revalidatePath("/transactions");
}

export async function rejectTransaction(formData: FormData) {
  const user = await requireUser();
  if (!canApprove(user.role)) throw new Error("Only approvers or admins can reject.");
  const id = String(formData.get("id"));
  const reason = String(formData.get("reason") || "");
  await prisma.transaction.update({
    where: { id },
    data: { status: "REJECTED", rejectedReason: reason || null },
  });
  await audit(user.id, "reject", "Transaction", id, reason);
  revalidatePath("/transactions");
}

// --------------------------------------------------------------------------
// Invoices
// --------------------------------------------------------------------------
const genInvoiceSchema = z.object({
  transactionId: z.string().min(1),
  taxRatePct: z.coerce.number().min(0).max(100),
  dueInDays: z.coerce.number().int().min(0).max(365),
  notes: z.string().optional(),
});

export async function createInvoice(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("You do not have permission to do this.");
  const data = genInvoiceSchema.parse(Object.fromEntries(formData));
  const invoice = await generateInvoiceFromTransaction({
    transactionId: data.transactionId,
    taxRatePct: data.taxRatePct,
    dueDate: addDays(new Date(), data.dueInDays),
    notes: data.notes,
  });
  await audit(user.id, "create", "Invoice", invoice.id, invoice.number);
  revalidatePath("/invoices");
  revalidatePath("/transactions");
  redirect(`/invoices/${invoice.id}`);
}

export async function sendInvoice(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { organization: true } });
  if (!inv) throw new Error("Invoice not found");
  await prisma.invoice.update({ where: { id }, data: { status: "SENT" } });
  await queueEmail({
    toEmail: inv.organization.contactEmail,
    toName: inv.organization.contactName,
    type: "INVOICE_SENT",
    invoiceId: inv.id,
    subject: `Invoice ${inv.number} from roqit — ${formatPaise(inv.totalPaise)}`,
    body:
      `Hi ${inv.organization.name},\n\n` +
      `Please find invoice ${inv.number} for ${formatPaise(inv.totalPaise)}, due on ${inv.dueDate.toDateString()}.\n\n` +
      `Thank you,\nroqit Billing`,
  });
  await audit(user.id, "send", "Invoice", id, inv.number);
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/alerts");
}

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amountRupees: z.coerce.number().positive(),
  method: z.enum(["BANK_TRANSFER", "UPI", "CARD", "CASH", "CHEQUE", "OTHER"]),
  reference: z.string().optional(),
});

export async function recordPayment(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("You do not have permission to do this.");
  const data = paymentSchema.parse(Object.fromEntries(formData));
  await prisma.payment.create({
    data: {
      invoiceId: data.invoiceId,
      amountPaise: rupeesToPaise(data.amountRupees),
      method: data.method,
      reference: data.reference || null,
      recordedBy: user.name,
    },
  });
  await recomputeInvoiceStatus(data.invoiceId);
  await audit(user.id, "payment", "Invoice", data.invoiceId, `${formatPaise(rupeesToPaise(data.amountRupees))} via ${data.method}`);
  revalidatePath(`/invoices/${data.invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/");
}

// --------------------------------------------------------------------------
// Plans & Subscriptions
// --------------------------------------------------------------------------
const planSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amountRupees: z.coerce.number().positive(),
  interval: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
});

export async function createPlan(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("You do not have permission to do this.");
  const data = planSchema.parse(Object.fromEntries(formData));
  const plan = await prisma.plan.create({
    data: {
      name: data.name,
      description: data.description,
      amountPaise: rupeesToPaise(data.amountRupees),
      interval: data.interval,
    },
  });
  await audit(user.id, "create", "Plan", plan.id, plan.name);
  revalidatePath("/plans");
  redirect("/plans");
}

const subSchema = z.object({
  organizationId: z.string().min(1),
  planId: z.string().min(1),
  amountRupees: z.coerce.number().positive(),
  startDate: z.string().min(1),
});

export async function createSubscription(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("You do not have permission to do this.");
  const data = subSchema.parse(Object.fromEntries(formData));
  const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
  if (!plan) throw new Error("Plan not found");
  const start = new Date(data.startDate);
  const sub = await prisma.subscription.create({
    data: {
      organizationId: data.organizationId,
      planId: data.planId,
      amountPaise: rupeesToPaise(data.amountRupees),
      interval: plan.interval,
      startDate: start,
      nextBillingDate: advanceBillingDate(start, plan.interval as Interval),
    },
  });
  await audit(user.id, "create", "Subscription", sub.id);
  revalidatePath("/subscriptions");
  redirect("/subscriptions");
}

export async function setSubscriptionStatus(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("You do not have permission to do this.");
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  await prisma.subscription.update({ where: { id }, data: { status } });
  await audit(user.id, "status", "Subscription", id, status);
  revalidatePath("/subscriptions");
}

// --------------------------------------------------------------------------
// Automation
// --------------------------------------------------------------------------
export async function runAlertsAction(): Promise<{ message: string }> {
  await requireUser();
  const a = await runAlerts();
  const f = await flushOutbox();
  revalidatePath("/alerts");
  revalidatePath("/invoices");
  revalidatePath("/");
  return {
    message: `Overdue: ${a.markedOverdue} · Reminders queued: ${a.dueSoonQueued + a.overdueQueued} · Emails sent: ${f.sent}`,
  };
}

export async function runBillingAction(): Promise<{ message: string }> {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("You do not have permission to do this.");
  const raised = await runSubscriptionBilling(user.id);
  revalidatePath("/transactions");
  revalidatePath("/subscriptions");
  return { message: raised > 0 ? `Raised ${raised} charge(s) for approval.` : "Nothing due right now." };
}
