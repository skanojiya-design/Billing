import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, subMonths, addMonths } from "date-fns";

const prisma = new PrismaClient();

const rupees = (r: number) => Math.round(r * 100); // to paise

async function main() {
  console.log("Seeding roqit Billing…");

  // Wipe (order matters due to FKs)
  await prisma.emailOutbox.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  // ---- Users -------------------------------------------------------------
  const pwd = await bcrypt.hash("password123", 10);
  const admin = await prisma.user.create({
    data: { email: "admin@roqit.com", name: "Admin", passwordHash: pwd, role: "ADMIN" },
  });
  const approver = await prisma.user.create({
    data: { email: "approver@roqit.com", name: "Priya (Finance)", passwordHash: pwd, role: "APPROVER" },
  });
  await prisma.user.create({
    data: { email: "viewer@roqit.com", name: "Viewer", passwordHash: pwd, role: "VIEWER" },
  });

  // ---- Plans -------------------------------------------------------------
  const starter = await prisma.plan.create({
    data: { name: "Starter", description: "Up to 5 seats", amountPaise: rupees(4999), interval: "MONTHLY" },
  });
  const growth = await prisma.plan.create({
    data: { name: "Growth", description: "Up to 25 seats", amountPaise: rupees(14999), interval: "MONTHLY" },
  });
  const enterprise = await prisma.plan.create({
    data: { name: "Enterprise", description: "Unlimited seats + SLA", amountPaise: rupees(120000), interval: "YEARLY" },
  });

  // ---- Organizations -----------------------------------------------------
  const acme = await prisma.organization.create({
    data: {
      name: "Acme Retail Pvt Ltd",
      contactName: "Rahul Verma",
      contactEmail: "rahul@acmeretail.example",
      phone: "+91 98200 11111",
      gstin: "27AABCA1234A1Z5",
      billingAddress: "12 MG Road, Bengaluru 560001",
      notes: "Long-time customer. Prefers quarterly invoicing.",
    },
  });
  const nimbus = await prisma.organization.create({
    data: {
      name: "Nimbus Logistics",
      contactName: "Sana Kapoor",
      contactEmail: "sana@nimbus.example",
      phone: "+91 99870 22222",
      gstin: "29AACCN5678B1Z2",
      billingAddress: "Plot 44, HITEC City, Hyderabad 500081",
    },
  });
  const zenith = await prisma.organization.create({
    data: {
      name: "Zenith Media",
      contactName: "Arjun Nair",
      contactEmail: "arjun@zenithmedia.example",
      phone: "+91 90040 33333",
      billingAddress: "5th Floor, Lower Parel, Mumbai 400013",
    },
  });

  // ---- Subscriptions -----------------------------------------------------
  const acmeSub = await prisma.subscription.create({
    data: {
      organizationId: acme.id,
      planId: growth.id,
      amountPaise: growth.amountPaise,
      interval: "MONTHLY",
      startDate: subMonths(new Date(), 6),
      nextBillingDate: addDays(new Date(), 3), // billing soon
    },
  });
  await prisma.subscription.create({
    data: {
      organizationId: nimbus.id,
      planId: starter.id,
      amountPaise: starter.amountPaise,
      interval: "MONTHLY",
      startDate: subMonths(new Date(), 2),
      nextBillingDate: subDays(new Date(), 1), // due now — billing run will raise a charge
    },
  });
  await prisma.subscription.create({
    data: {
      organizationId: zenith.id,
      planId: enterprise.id,
      amountPaise: enterprise.amountPaise,
      interval: "YEARLY",
      startDate: subMonths(new Date(), 1),
      nextBillingDate: addMonths(new Date(), 11),
    },
  });

  // ---- Transactions in various states -----------------------------------
  // 1) A paid subscription charge (last month) -> invoice -> payment
  const t1 = await prisma.transaction.create({
    data: {
      organizationId: acme.id,
      type: "SUBSCRIPTION",
      description: "Growth — monthly subscription",
      amountPaise: growth.amountPaise,
      status: "PAID",
      subscriptionId: acmeSub.id,
      createdById: admin.id,
      approvedById: approver.id,
      approvedAt: subMonths(new Date(), 1),
      paidAt: subDays(new Date(), 20),
      dueDate: subDays(new Date(), 25),
    },
  });
  const inv1 = await prisma.invoice.create({
    data: {
      number: `ROQ-${new Date().getFullYear()}-0001`,
      organizationId: acme.id,
      transactionId: t1.id,
      status: "PAID",
      issueDate: subMonths(new Date(), 1),
      dueDate: subDays(new Date(), 25),
      subtotalPaise: growth.amountPaise,
      taxRatePct: 18,
      taxPaise: Math.round(growth.amountPaise * 0.18),
      totalPaise: growth.amountPaise + Math.round(growth.amountPaise * 0.18),
      amountPaidPaise: growth.amountPaise + Math.round(growth.amountPaise * 0.18),
      lineItems: {
        create: [{ description: "Growth — monthly subscription", quantity: 1, unitAmountPaise: growth.amountPaise, amountPaise: growth.amountPaise }],
      },
    },
  });
  await prisma.payment.create({
    data: { invoiceId: inv1.id, amountPaise: inv1.totalPaise, method: "UPI", reference: "UPI-8842019", paidAt: subDays(new Date(), 20), recordedBy: admin.name },
  });

  // 2) An OVERDUE invoice (pay-as-you-go, past due date, unpaid)
  const t2 = await prisma.transaction.create({
    data: {
      organizationId: nimbus.id,
      type: "PAY_AS_YOU_GO",
      description: "API overage — 1.2M extra calls",
      amountPaise: rupees(23400),
      status: "INVOICED",
      createdById: admin.id,
      approvedById: approver.id,
      approvedAt: subDays(new Date(), 40),
      dueDate: subDays(new Date(), 10),
    },
  });
  await prisma.invoice.create({
    data: {
      number: `ROQ-${new Date().getFullYear()}-0002`,
      organizationId: nimbus.id,
      transactionId: t2.id,
      status: "SENT", // alert engine will flip this to OVERDUE on first run
      issueDate: subDays(new Date(), 40),
      dueDate: subDays(new Date(), 10),
      subtotalPaise: rupees(23400),
      taxRatePct: 18,
      taxPaise: Math.round(rupees(23400) * 0.18),
      totalPaise: rupees(23400) + Math.round(rupees(23400) * 0.18),
      lineItems: {
        create: [{ description: "API overage — 1.2M extra calls", quantity: 1, unitAmountPaise: rupees(23400), amountPaise: rupees(23400) }],
      },
    },
  });

  // 3) A DUE-SOON invoice (one-time, due in 3 days, unpaid)
  const t3 = await prisma.transaction.create({
    data: {
      organizationId: zenith.id,
      type: "ONE_TIME",
      description: "Onboarding & data migration (one-time)",
      amountPaise: rupees(75000),
      status: "INVOICED",
      createdById: admin.id,
      approvedById: approver.id,
      approvedAt: subDays(new Date(), 5),
      dueDate: addDays(new Date(), 3),
    },
  });
  await prisma.invoice.create({
    data: {
      number: `ROQ-${new Date().getFullYear()}-0003`,
      organizationId: zenith.id,
      transactionId: t3.id,
      status: "SENT",
      issueDate: subDays(new Date(), 5),
      dueDate: addDays(new Date(), 3),
      subtotalPaise: rupees(75000),
      taxRatePct: 18,
      taxPaise: Math.round(rupees(75000) * 0.18),
      totalPaise: rupees(75000) + Math.round(rupees(75000) * 0.18),
      lineItems: {
        create: [{ description: "Onboarding & data migration (one-time)", quantity: 1, unitAmountPaise: rupees(75000), amountPaise: rupees(75000) }],
      },
    },
  });

  // 4) A transaction PENDING APPROVAL (needs an approver to act)
  await prisma.transaction.create({
    data: {
      organizationId: acme.id,
      type: "PAY_AS_YOU_GO",
      description: "Additional storage — 500 GB (this month)",
      amountPaise: rupees(6200),
      status: "PENDING_APPROVAL",
      createdById: admin.id,
      dueDate: addDays(new Date(), 15),
    },
  });

  // 5) A DRAFT transaction (not yet submitted)
  await prisma.transaction.create({
    data: {
      organizationId: zenith.id,
      type: "ONE_TIME",
      description: "Custom report build (draft estimate)",
      amountPaise: rupees(18000),
      status: "DRAFT",
      createdById: admin.id,
    },
  });

  console.log("Seed complete.");
  console.log("\nLogin with:");
  console.log("  admin@roqit.com     / password123  (Admin)");
  console.log("  approver@roqit.com  / password123  (Approver)");
  console.log("  viewer@roqit.com    / password123  (Viewer)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
