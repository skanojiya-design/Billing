import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { setSubscriptionStatus } from "@/app/actions";
import { INTERVAL_LABELS } from "@/lib/constants";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const subs = await prisma.subscription.findMany({
    orderBy: { nextBillingDate: "asc" },
    include: { organization: true, plan: true },
  });

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring commitments and next billing dates"
        action={<Link href="/subscriptions/new" className="btn-primary">+ New subscription</Link>}
      />

      {subs.length === 0 ? (
        <EmptyState title="No subscriptions yet" hint="Create a plan first, then subscribe an organization." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="th">Organization</th>
                <th className="th">Plan</th>
                <th className="th text-right">Amount</th>
                <th className="th">Cycle</th>
                <th className="th">Next billing</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="td font-medium text-gray-900">
                    <Link href={`/organizations/${s.organizationId}`} className="hover:text-brand-600">{s.organization.name}</Link>
                  </td>
                  <td className="td">{s.plan.name}</td>
                  <td className="td text-right tabular-nums">{formatPaise(s.amountPaise)}</td>
                  <td className="td">{INTERVAL_LABELS[s.interval as keyof typeof INTERVAL_LABELS]}</td>
                  <td className="td text-gray-500">{format(s.nextBillingDate, "d MMM yyyy")}</td>
                  <td className="td"><StatusBadge status={s.status} /></td>
                  <td className="td">
                    <div className="flex justify-end gap-1.5">
                      {s.status === "ACTIVE" ? (
                        <form action={setSubscriptionStatus}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="status" value="PAUSED" />
                          <button className="btn-secondary px-2.5 py-1 text-xs">Pause</button>
                        </form>
                      ) : s.status === "PAUSED" ? (
                        <form action={setSubscriptionStatus}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="status" value="ACTIVE" />
                          <button className="btn-secondary px-2.5 py-1 text-xs">Resume</button>
                        </form>
                      ) : null}
                      {s.status !== "CANCELLED" && (
                        <form action={setSubscriptionStatus}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="status" value="CANCELLED" />
                          <button className="btn-danger px-2.5 py-1 text-xs">Cancel</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
