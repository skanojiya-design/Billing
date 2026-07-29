import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { createPlan } from "@/app/actions";
import { INTERVALS, INTERVAL_LABELS } from "@/lib/constants";

export default function NewPlanPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New plan" subtitle="Define reusable subscription pricing" />
      <form action={createPlan} className="card space-y-5 p-6">
        <div>
          <label className="label">Plan name</label>
          <input name="name" className="input" placeholder="Growth" required />
        </div>
        <div>
          <label className="label">Description</label>
          <input name="description" className="input" placeholder="Up to 25 seats" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Price (₹ per cycle)</label>
            <input name="amountRupees" type="number" step="0.01" min="0" className="input" placeholder="14999" required />
          </div>
          <div>
            <label className="label">Billing cycle</label>
            <select name="interval" className="input">
              {INTERVALS.map((i) => <option key={i} value={i}>{INTERVAL_LABELS[i]}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button className="btn-primary">Create plan</button>
          <Link href="/plans" className="text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
