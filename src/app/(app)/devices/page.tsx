import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser, canEdit } from "@/lib/auth";
import { formatMoneyCompact } from "@/lib/money";
import {
  DEVICE_STATUSES,
  DEVICE_STATUS_LABELS,
  type DeviceStatus,
  type Currency,
} from "@/lib/constants";
import { PageHeader, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: { status?: string; supplierId?: string; q?: string };
}) {
  const user = await getSessionUser();
  const editable = user ? canEdit(user.role) : false;

  const status = searchParams.status?.trim() || "";
  const supplierId = searchParams.supplierId?.trim() || "";
  const q = searchParams.q?.trim() || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (supplierId) where.supplierId = supplierId;
  if (q) {
    where.OR = [
      { serialNo: { contains: q, mode: "insensitive" } },
      { imei: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { make: { contains: q, mode: "insensitive" } },
      { assetTag: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const [devices, suppliers, total] = await Promise.all([
    prisma.device.findMany({ where, orderBy: { createdAt: "desc" }, include: { supplier: true }, take: 1000 }),
    prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.device.count(),
  ]);

  const queryStr = new URLSearchParams({ ...(status && { status }), ...(supplierId && { supplierId }), ...(q && { q }) }).toString();

  return (
    <div>
      <PageHeader
        title="Devices"
        subtitle={`${total} device${total === 1 ? "" : "s"} in the inventory`}
        action={
          <div className="flex flex-wrap gap-2">
            <a href={`/api/export/devices${queryStr ? `?${queryStr}` : ""}`} className="btn-secondary">⬇ Export Excel</a>
            {editable && <Link href="/devices/new" className="btn-primary">Add device</Link>}
          </div>
        }
      />

      {/* Filters */}
      <form method="get" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[12rem] flex-1">
          <label className="label">Search</label>
          <input className="input" name="q" defaultValue={q} placeholder="Serial, IMEI, model, make…" />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {DEVICE_STATUSES.map((s) => <option key={s} value={s}>{DEVICE_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Supplier</label>
          <select className="input" name="supplierId" defaultValue={supplierId}>
            <option value="">All suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button className="btn-primary" type="submit">Filter</button>
        {(status || supplierId || q) && <Link href="/devices" className="btn-secondary">Clear</Link>}
      </form>

      {devices.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-medium text-gray-900">No devices found.</p>
          {editable && <p className="mt-1 text-sm text-gray-500">Add devices directly, or from a purchase.</p>}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Category / Model</th>
                <th className="th">Serial</th>
                <th className="th">IMEI</th>
                <th className="th">Supplier</th>
                <th className="th">Status</th>
                <th className="th">Location / Assigned</th>
                <th className="th text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devices.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="td">
                    <Link href={`/devices/${d.id}`} className="font-medium text-brand-600 hover:underline">
                      {d.category}
                    </Link>
                    {(d.make || d.model) && <p className="text-xs text-gray-400">{[d.make, d.model].filter(Boolean).join(" ")}</p>}
                  </td>
                  <td className="td">{d.serialNo || "—"}</td>
                  <td className="td">{d.imei || "—"}</td>
                  <td className="td">{d.supplier?.name || "—"}</td>
                  <td className="td"><StatusBadge status={d.status} label={DEVICE_STATUS_LABELS[d.status as DeviceStatus] ?? d.status} /></td>
                  <td className="td">
                    {d.location || "—"}
                    {d.assignedTo && <p className="text-xs text-gray-400">{d.assignedTo}</p>}
                  </td>
                  <td className="td text-right">{d.costMinor ? formatMoneyCompact(d.costMinor, d.currency as Currency) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
