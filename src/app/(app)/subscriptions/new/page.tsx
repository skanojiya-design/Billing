import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createSubscription } from "@/app/actions";
import { formatPaise } from "@/lib/money";
import { INTERVAL_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function NewSubscriptionPage() {
  const [orgs, plans] = await Promise.all([
    prisma.organization.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const missing = orgs.length === 0 || plans.length === 0;

  return (
    <div className="max-w-2xl">
      <PageHeader title="New subscription" subtitle="Subscribe an organization to a plan" />

      {missing ? (
        <div className="card p-6 text-sm text-gray-600">
          You need at least one organization and one plan first.
          {orgs.length === 0 && <> <Link href="/organizations/new" className="text-brand-600 hover:underline">Add an organization →</Link></>}
          {plans.length === 0 && <> <Link href="/plans/new" className="text-brand-600 hover:underline">Add a plan →</Link></>}
        </div>
      ) : (
        <form action={createSubscription} className="card space-y-5 p-6">
          <div>
            <label className="label">Organization</label>
            <select name="organizationId" className="input" required>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Plan</label>
            <select name="planId" className="input" required>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatPaise(p.amountPaise)} / {INTERVAL_LABELS[p.interval as keyof typeof INTERVAL_LABELS]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (₹ per cycle)</label>
              <input name="amountRupees" type="number" step="0.01" min="0" className="input" placeholder="Custom or plan price" required />
            </div>
            <div>
              <label className="label">Start date</label>
              <input name="startDate" type="date" className="input" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
          </div>
          <p className="text-xs text-gray-400">The cycle (monthly/quarterly/yearly) comes from the selected plan. Next billing date is set automatically.</p>
          <div className="flex items-center gap-3 pt-2">
            <button className="btn-primary">Create subscription</button>
            <Link href="/subscriptions" className="text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  );
}
