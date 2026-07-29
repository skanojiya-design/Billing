import { prisma } from "./db";

// Helpers for the monthly payment rows (PaymentEntry) — the heart of the tracker.

/** Build a due date inside a given period from a service's dueDayOfMonth. */
export function dueDateFor(year: number, month: number, dueDay?: number | null): Date | null {
  if (!dueDay) return null;
  // Clamp to the last day of the month (e.g. day 31 in February).
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(dueDay, 1), lastDay);
  return new Date(year, month - 1, day);
}

/**
 * Generate this-period rows for every active service that doesn't already have
 * one. Amounts are pre-filled from the service defaults; status starts PENDING.
 * Returns how many rows were created.
 */
export async function generateEntriesForPeriod(
  year: number,
  month: number,
  actorUserId?: string,
): Promise<number> {
  const services = await prisma.service.findMany({ where: { active: true } });
  let created = 0;

  for (const s of services) {
    // Annual services only bill once a year — skip auto-generating monthly rows.
    // (Users can still add them manually in the month they fall due.)
    const existing = await prisma.paymentEntry.findFirst({
      where: { serviceId: s.id, periodYear: year, periodMonth: month },
    });
    if (existing) continue;

    await prisma.paymentEntry.create({
      data: {
        serviceId: s.id,
        serviceName: s.name,
        vendorType: s.vendorType,
        billingFrequency: s.billingFrequency,
        periodYear: year,
        periodMonth: month,
        dueDate: dueDateFor(year, month, s.dueDayOfMonth),
        status: "PENDING",
        amountInrPaise: s.defaultInrPaise,
        amountUsdCents: s.defaultUsdCents,
        amountEurCents: s.defaultEurCents,
        createdById: actorUserId ?? null,
      },
    });
    created++;
  }

  return created;
}

/** Sum the three currency columns + this-month-paid for a set of rows. */
export function totalsFor(
  entries: {
    amountInrPaise: number;
    amountUsdCents: number;
    amountEurCents: number;
    thisMonthPaidInrPaise: number;
  }[],
) {
  return entries.reduce(
    (acc, e) => ({
      inr: acc.inr + e.amountInrPaise,
      usd: acc.usd + e.amountUsdCents,
      eur: acc.eur + e.amountEurCents,
      paid: acc.paid + e.thisMonthPaidInrPaise,
    }),
    { inr: 0, usd: 0, eur: 0, paid: 0 },
  );
}

/** The list of periods (year+month) that actually have rows, newest first. */
export async function listPeriods(): Promise<{ year: number; month: number }[]> {
  const rows = await prisma.paymentEntry.findMany({
    select: { periodYear: true, periodMonth: true },
    distinct: ["periodYear", "periodMonth"],
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });
  return rows.map((r) => ({ year: r.periodYear, month: r.periodMonth }));
}
