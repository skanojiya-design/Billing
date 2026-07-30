"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markPaid, markPending, deleteEntry } from "@/app/actions";

// Compact inline actions for a payment row. Only rendered for editors/admins.
export function EntryActions({
  id,
  status,
  editHref,
}: {
  id: string;
  status: string;
  editHref: string;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
      {status !== "PAID" ? (
        <button
          className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
          disabled={pending}
          onClick={() => start(() => markPaid(id))}
          title="Mark as paid (today)"
        >
          ✓ Paid
        </button>
      ) : (
        <button
          className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
          disabled={pending}
          onClick={() => start(() => markPending(id))}
          title="Reopen as pending"
        >
          ↺ Reopen
        </button>
      )}
      <Link href={editHref} className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100">
        Edit
      </Link>
      <button
        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this row?")) start(() => deleteEntry(id));
        }}
        title="Delete row"
      >
        ✕
      </button>
    </div>
  );
}
