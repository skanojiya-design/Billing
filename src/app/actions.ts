"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  canEdit,
  assertCanEdit,
  assertCanManageUsers,
  hashPassword,
} from "@/lib/auth";
import { majorToMinor } from "@/lib/money";
import { generateEntriesForPeriod, dueDateFor } from "@/lib/entries";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { runAlerts } from "@/lib/alerts";
import { flushOutbox } from "@/lib/email";

async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

async function requireEditor() {
  const user = await requireUser();
  assertCanEdit(user.role);
  return user;
}

async function audit(actorId: string, action: string, entity: string, entityId?: string, detail?: string) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId, detail } });
}

function trackerPath(year: number, month: number) {
  return `/tracker?y=${year}&m=${month}`;
}

// --------------------------------------------------------------------------
// Services (recurring vendor definitions)
// --------------------------------------------------------------------------
const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  vendorType: z.enum(["SUBSCRIPTION", "SERVICE"]),
  billingFrequency: z.enum(["MONTHLY", "ANNUAL", "MONTHLY_USAGE", "PAY_AS_YOU_GO", "ONE_TIME"]),
  currency: z.enum(["INR", "USD", "EUR"]),
  dueDayOfMonth: z.coerce.number().int().min(1).max(31).optional().or(z.literal(NaN)),
  defaultInr: z.coerce.number().min(0).default(0),
  defaultUsd: z.coerce.number().min(0).default(0),
  defaultEur: z.coerce.number().min(0).default(0),
  vendorUrl: z.string().optional(),
  notes: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

export async function saveService(formData: FormData) {
  const user = await requireEditor();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = serviceSchema.parse({ ...raw, active: raw.active === "on" || raw.active === "true" });

  const data = {
    name: parsed.name.trim(),
    vendorType: parsed.vendorType,
    billingFrequency: parsed.billingFrequency,
    currency: parsed.currency,
    dueDayOfMonth: Number.isFinite(parsed.dueDayOfMonth) ? parsed.dueDayOfMonth : null,
    defaultInrPaise: majorToMinor(parsed.defaultInr),
    defaultUsdCents: majorToMinor(parsed.defaultUsd),
    defaultEurCents: majorToMinor(parsed.defaultEur),
    vendorUrl: parsed.vendorUrl?.trim() || null,
    notes: parsed.notes?.trim() || null,
    active: parsed.active ?? true,
  };

  if (parsed.id) {
    await prisma.service.update({ where: { id: parsed.id }, data });
    await audit(user.id, "UPDATE", "Service", parsed.id, data.name);
  } else {
    const created = await prisma.service.create({ data });
    await audit(user.id, "CREATE", "Service", created.id, data.name);
  }
  revalidatePath("/services");
  redirect("/services");
}

export async function toggleServiceActive(id: string) {
  const user = await requireEditor();
  const svc = await prisma.service.findUnique({ where: { id } });
  if (!svc) throw new Error("Service not found");
  await prisma.service.update({ where: { id }, data: { active: !svc.active } });
  await audit(user.id, svc.active ? "DEACTIVATE" : "ACTIVATE", "Service", id, svc.name);
  revalidatePath("/services");
}

// --------------------------------------------------------------------------
// Payment entries (the monthly rows)
// --------------------------------------------------------------------------
const entrySchema = z.object({
  id: z.string().optional(),
  serviceId: z.string().optional(),
  serviceName: z.string().min(1, "Service is required"),
  vendorType: z.enum(["SUBSCRIPTION", "SERVICE"]),
  billingFrequency: z.enum(["MONTHLY", "ANNUAL", "MONTHLY_USAGE", "PAY_AS_YOU_GO", "ONE_TIME"]),
  periodYear: z.coerce.number().int(),
  periodMonth: z.coerce.number().int().min(1).max(12),
  status: z.enum(["PENDING", "PAID", "OVERDUE"]),
  dueDate: z.string().optional(),
  paymentMadeOn: z.string().optional(),
  amountInr: z.coerce.number().min(0).default(0),
  amountUsd: z.coerce.number().min(0).default(0),
  amountEur: z.coerce.number().min(0).default(0),
  thisMonthPaidInr: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

export async function saveEntry(formData: FormData) {
  const user = await requireEditor();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const p = entrySchema.parse(raw);

  const data = {
    serviceId: p.serviceId || null,
    serviceName: p.serviceName.trim(),
    vendorType: p.vendorType,
    billingFrequency: p.billingFrequency,
    periodYear: p.periodYear,
    periodMonth: p.periodMonth,
    status: p.status,
    dueDate: parseDate(p.dueDate),
    paymentMadeOn: parseDate(p.paymentMadeOn),
    amountInrPaise: majorToMinor(p.amountInr),
    amountUsdCents: majorToMinor(p.amountUsd),
    amountEurCents: majorToMinor(p.amountEur),
    thisMonthPaidInrPaise: majorToMinor(p.thisMonthPaidInr),
    notes: p.notes?.trim() || null,
  };

  if (p.id) {
    await prisma.paymentEntry.update({ where: { id: p.id }, data });
    await audit(user.id, "UPDATE", "PaymentEntry", p.id, `${data.serviceName} ${p.periodMonth}/${p.periodYear}`);
  } else {
    const created = await prisma.paymentEntry.create({ data: { ...data, createdById: user.id } });
    await audit(user.id, "CREATE", "PaymentEntry", created.id, `${data.serviceName} ${p.periodMonth}/${p.periodYear}`);
  }
  revalidatePath(trackerPath(p.periodYear, p.periodMonth));
  redirect(trackerPath(p.periodYear, p.periodMonth));
}

/** Quick "mark paid" — sets status PAID, paidOn today, and this-month-paid to the INR amount. */
export async function markPaid(id: string) {
  const user = await requireEditor();
  const entry = await prisma.paymentEntry.findUnique({ where: { id } });
  if (!entry) throw new Error("Row not found");
  await prisma.paymentEntry.update({
    where: { id },
    data: {
      status: "PAID",
      paymentMadeOn: new Date(),
      thisMonthPaidInrPaise: entry.thisMonthPaidInrPaise || entry.amountInrPaise,
    },
  });
  await audit(user.id, "MARK_PAID", "PaymentEntry", id, entry.serviceName);
  revalidatePath(trackerPath(entry.periodYear, entry.periodMonth));
}

export async function markPending(id: string) {
  const user = await requireEditor();
  const entry = await prisma.paymentEntry.findUnique({ where: { id } });
  if (!entry) throw new Error("Row not found");
  await prisma.paymentEntry.update({
    where: { id },
    data: { status: "PENDING", paymentMadeOn: null, thisMonthPaidInrPaise: 0 },
  });
  await audit(user.id, "MARK_PENDING", "PaymentEntry", id, entry.serviceName);
  revalidatePath(trackerPath(entry.periodYear, entry.periodMonth));
}

export async function deleteEntry(id: string) {
  const user = await requireEditor();
  const entry = await prisma.paymentEntry.findUnique({ where: { id } });
  if (!entry) return;
  await prisma.paymentEntry.delete({ where: { id } });
  await audit(user.id, "DELETE", "PaymentEntry", id, entry.serviceName);
  revalidatePath(trackerPath(entry.periodYear, entry.periodMonth));
}

/** Generate this-period rows from active services. Returns via redirect. */
export async function generateMonth(formData: FormData) {
  await requireEditor();
  const user = await getSessionUser();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const created = await generateEntriesForPeriod(year, month, user?.id);
  if (user) await audit(user.id, "GENERATE_MONTH", "PaymentEntry", undefined, `${created} rows for ${month}/${year}`);
  revalidatePath(trackerPath(year, month));
  redirect(trackerPath(year, month));
}

// --------------------------------------------------------------------------
// Documents (invoices / receipts)
// --------------------------------------------------------------------------
export async function addDocument(formData: FormData) {
  const user = await requireEditor();
  const entryId = String(formData.get("entryId") || "");
  const entry = await prisma.paymentEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new Error("Row not found");

  const kind = String(formData.get("kind") || "FILE");
  const title = String(formData.get("title") || "").trim();

  if (kind === "LINK") {
    const url = String(formData.get("externalUrl") || "").trim();
    if (!url) throw new Error("Please provide a link.");
    await prisma.document.create({
      data: {
        entryId,
        kind: "LINK",
        title: title || url,
        externalUrl: url,
        uploadedById: user.id,
      },
    });
  } else {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) throw new Error("Please choose a file to upload.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const storedName = await saveUpload(file.name, bytes);
    await prisma.document.create({
      data: {
        entryId,
        kind: "FILE",
        title: title || file.name,
        originalName: file.name,
        storedName,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        uploadedById: user.id,
      },
    });
  }
  await audit(user.id, "ADD_DOCUMENT", "PaymentEntry", entryId, title);
  revalidatePath(trackerPath(entry.periodYear, entry.periodMonth));
  revalidatePath("/documents");
  redirect(trackerPath(entry.periodYear, entry.periodMonth));
}

export async function deleteDocument(id: string) {
  const user = await requireEditor();
  const doc = await prisma.document.findUnique({ where: { id }, include: { entry: true } });
  if (!doc) return;
  if (doc.kind === "FILE" && doc.storedName) await deleteUpload(doc.storedName);
  await prisma.document.delete({ where: { id } });
  await audit(user.id, "DELETE_DOCUMENT", "Document", id, doc.title);
  if (doc.entry) revalidatePath(trackerPath(doc.entry.periodYear, doc.entry.periodMonth));
  revalidatePath("/documents");
}

// --------------------------------------------------------------------------
// Team members (admin only)
// --------------------------------------------------------------------------
const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
  password: z.string().optional(),
});

export async function saveUser(formData: FormData) {
  const actor = await requireUser();
  assertCanManageUsers(actor.role);
  const p = userSchema.parse(Object.fromEntries(formData));
  const email = p.email.toLowerCase().trim();

  if (p.id) {
    const data: Record<string, unknown> = { name: p.name.trim(), email, role: p.role };
    if (p.password && p.password.length >= 6) data.passwordHash = await hashPassword(p.password);
    await prisma.user.update({ where: { id: p.id }, data });
    await audit(actor.id, "UPDATE", "User", p.id, email);
  } else {
    if (!p.password || p.password.length < 6) throw new Error("Password must be at least 6 characters.");
    const created = await prisma.user.create({
      data: { name: p.name.trim(), email, role: p.role, passwordHash: await hashPassword(p.password) },
    });
    await audit(actor.id, "CREATE", "User", created.id, email);
  }
  revalidatePath("/team");
  redirect("/team");
}

export async function toggleUserActive(id: string) {
  const actor = await requireUser();
  assertCanManageUsers(actor.role);
  if (id === actor.id) throw new Error("You can't deactivate your own account.");
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  await prisma.user.update({ where: { id }, data: { active: !u.active } });
  await audit(actor.id, u.active ? "DEACTIVATE" : "ACTIVATE", "User", id, u.email);
  revalidatePath("/team");
}

// --------------------------------------------------------------------------
// Alerts
// --------------------------------------------------------------------------
export async function runAlertsAction() {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("Only editors/admins can run alerts.");
  const r = await runAlerts();
  await audit(user.id, "RUN_ALERTS", "System", undefined, JSON.stringify(r));
  revalidatePath("/alerts");
  return {
    message: `Marked ${r.markedOverdue} overdue · queued ${r.dueSoonQueued} due-soon + ${r.overdueQueued} overdue reminders.`,
  };
}

export async function flushOutboxAction() {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("Only editors/admins can send email.");
  const r = await flushOutbox();
  await audit(user.id, "FLUSH_OUTBOX", "System", undefined, JSON.stringify(r));
  revalidatePath("/alerts");
  return { message: `Sent ${r.sent} email(s)${r.failed ? `, ${r.failed} failed` : ""}.` };
}
