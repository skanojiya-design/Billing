import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { createOrganization } from "@/app/actions";

export default function NewOrganizationPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New organization" subtitle="Add an account to bill" />
      <form action={createOrganization} className="card space-y-5 p-6">
        <div>
          <label className="label">Organization name</label>
          <input name="name" className="input" placeholder="Acme Retail Pvt Ltd" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Contact name</label>
            <input name="contactName" className="input" placeholder="Rahul Verma" />
          </div>
          <div>
            <label className="label">Contact email</label>
            <input name="contactEmail" type="email" className="input" placeholder="billing@acme.com" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input name="phone" className="input" placeholder="+91 …" />
          </div>
          <div>
            <label className="label">GSTIN</label>
            <input name="gstin" className="input" placeholder="27AABCA1234A1Z5" />
          </div>
        </div>
        <div>
          <label className="label">Billing address</label>
          <input name="billingAddress" className="input" placeholder="Street, City, PIN" />
        </div>
        <div>
          <label className="label">Notes</label>
          <input name="notes" className="input" placeholder="Anything worth remembering" />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button className="btn-primary">Create organization</button>
          <Link href="/organizations" className="text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
