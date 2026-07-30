import Link from "next/link";
import { prisma } from "@/lib/db";
import { listPeriods } from "@/lib/entries";
import { monthLabel, MONTH_NAMES } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { q?: string; service?: string; period?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const service = (searchParams.service ?? "").trim();
  const period = (searchParams.period ?? "").trim(); // "YYYY-M"

  const [year, month] = period.includes("-") ? period.split("-").map(Number) : [undefined, undefined];

  const entryWhere: Record<string, unknown> = {};
  if (service) entryWhere.serviceName = service;
  if (year && month) {
    entryWhere.periodYear = year;
    entryWhere.periodMonth = month;
  }

  const docs = await prisma.document.findMany({
    where: Object.keys(entryWhere).length ? { entry: entryWhere } : {},
    include: { entry: true, uploadedBy: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const filtered = q
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q.toLowerCase()) ||
          (d.entry?.serviceName ?? "").toLowerCase().includes(q.toLowerCase()),
      )
    : docs;

  const services = await prisma.service.findMany({ orderBy: { name: "asc" }, select: { name: true } });
  const periods = await listPeriods();

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Every invoice & receipt, searchable in one place."
      />

      {/* Filter bar */}
      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" method="get">
        <div className="flex-1 min-w-[12rem]">
          <label className="label">Search</label>
          <input className="input" name="q" defaultValue={q} placeholder="Title or service…" />
        </div>
        <div>
          <label className="label">Service</label>
          <select className="input" name="service" defaultValue={service}>
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Month</label>
          <select className="input" name="period" defaultValue={period}>
            <option value="">All months</option>
            {periods.map((p) => (
              <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                {MONTH_NAMES[p.month - 1].slice(0, 3)} {p.year}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" type="submit">Filter</button>
        {(q || service || period) && <Link href="/documents" className="btn-secondary">Clear</Link>}
      </form>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-medium text-gray-900">No documents found.</p>
          <p className="mt-1 text-sm text-gray-500">Attach invoices/receipts from any row in the Monthly Tracker.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Document</th>
                <th className="th">Service</th>
                <th className="th">Month</th>
                <th className="th">Type</th>
                <th className="th">Added by</th>
                <th className="th">Added</th>
                <th className="th text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="td font-medium text-gray-900">
                    {doc.kind === "LINK" ? "🔗 " : "📄 "}{doc.title}
                    {doc.sizeBytes ? <span className="ml-1 text-xs text-gray-400">({fmtSize(doc.sizeBytes)})</span> : null}
                  </td>
                  <td className="td">
                    {doc.entry ? (
                      <Link href={`/tracker/${doc.entryId}?y=${doc.entry.periodYear}&m=${doc.entry.periodMonth}`} className="text-brand-600 hover:underline">
                        {doc.entry.serviceName}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="td">{doc.entry ? monthLabel(doc.entry.periodYear, doc.entry.periodMonth) : "—"}</td>
                  <td className="td">{doc.kind === "LINK" ? "Link" : "File"}</td>
                  <td className="td">{doc.uploadedBy?.name ?? "—"}</td>
                  <td className="td">{format(doc.createdAt, "d MMM yyyy")}</td>
                  <td className="td text-right">
                    {doc.kind === "LINK" ? (
                      <a href={doc.externalUrl ?? "#"} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-600 hover:underline">Open ↗</a>
                    ) : (
                      <a href={`/api/documents/${doc.id}`} className="text-sm font-medium text-brand-600 hover:underline">Open</a>
                    )}
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
