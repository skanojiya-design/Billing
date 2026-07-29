import Link from "next/link";
import { STATUS_BADGE } from "@/lib/constants";

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-gray-100 text-gray-700";
  return <span className={`badge ${cls}`}>{label ?? status.replace(/_/g, " ").toLowerCase()}</span>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
  href?: string;
}) {
  const toneCls = {
    default: "text-gray-900",
    warning: "text-amber-600",
    danger: "text-red-600",
    success: "text-green-600",
  }[tone];
  const inner = (
    <div className="card p-5 h-full">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneCls}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}
