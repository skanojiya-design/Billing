import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { subscriptions: true, transactions: true } },
      invoices: { where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle="Every account — all billing rolls up here"
        action={<Link href="/organizations/new" className="btn-primary">+ New organization</Link>}
      />

      {orgs.length === 0 ? (
        <EmptyState title="No organizations yet" hint="Add your first account to start billing." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => {
            const outstanding = o.invoices.reduce((s, i) => s + (i.totalPaise - i.amountPaidPaise), 0);
            return (
              <Link key={o.id} href={`/organizations/${o.id}`} className="card p-5 transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{o.name}</h3>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">{o.contactEmail}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>{o._count.subscriptions} subs · {o._count.transactions} txns</span>
                  {outstanding > 0 && <span className="font-medium text-amber-600">{formatPaise(outstanding)} due</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
