import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createTransaction } from "@/app/actions";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const orgs = await prisma.organization.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl">
      <PageHeader title="New transaction" subtitle="Record a charge against an organization" />

      {orgs.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-gray-600">
            You need an organization first.{" "}
            <Link href="/organizations/new" className="text-brand-600 hover:underline">Create one →</Link>
          </p>
        </div>
      ) : (
        <form action={createTransaction} className="card space-y-5 p-6">
          <div>
            <label className="label">Organization</label>
            <select name="organizationId" className="input" required>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select name="type" className="input" required>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Amount (₹, before tax)</label>
              <input name="amountRupees" type="number" step="0.01" min="0" className="input" placeholder="0.00" required />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <input name="description" className="input" placeholder="e.g. Growth plan — March, API overage, onboarding fee" required />
          </div>

          <div>
            <label className="label">Due date (optional)</label>
            <input name="dueDate" type="date" className="input" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button name="submit" value="1" className="btn-primary">Save & submit for approval</button>
            <button name="submit" value="0" className="btn-secondary">Save as draft</button>
            <Link href="/transactions" className="ml-auto text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  );
}
