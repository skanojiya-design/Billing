import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/ui";
import { INTERVAL_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: { amountPaise: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Plans"
        subtitle="Reusable pricing for subscriptions"
        action={<Link href="/plans/new" className="btn-primary">+ New plan</Link>}
      />

      {plans.length === 0 ? (
        <EmptyState title="No plans yet" hint="Create a plan to offer subscriptions." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                {!p.active && <span className="badge bg-gray-100 text-gray-500">inactive</span>}
              </div>
              {p.description && <p className="mt-1 text-sm text-gray-500">{p.description}</p>}
              <p className="mt-4 text-2xl font-semibold text-gray-900">
                {formatPaise(p.amountPaise)}
                <span className="text-sm font-normal text-gray-400"> / {INTERVAL_LABELS[p.interval as keyof typeof INTERVAL_LABELS].toLowerCase()}</span>
              </p>
              <p className="mt-3 text-xs text-gray-400">{p._count.subscriptions} active subscriptions</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
