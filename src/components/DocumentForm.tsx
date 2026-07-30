"use client";

import { useState, useTransition } from "react";
import { addDocument, deleteDocument } from "@/app/actions";

export function DocumentForm({ entryId }: { entryId: string }) {
  const [kind, setKind] = useState<"FILE" | "LINK">("FILE");

  return (
    <form action={addDocument} className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="kind" value={kind} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setKind("FILE")}
          className={`rounded-lg px-3 py-1 text-sm font-medium ${kind === "FILE" ? "bg-brand-600 text-white" : "bg-white ring-1 ring-inset ring-gray-300"}`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setKind("LINK")}
          className={`rounded-lg px-3 py-1 text-sm font-medium ${kind === "LINK" ? "bg-brand-600 text-white" : "bg-white ring-1 ring-inset ring-gray-300"}`}
        >
          Paste a link
        </button>
      </div>

      <div>
        <label className="label">Title (optional)</label>
        <input className="input" name="title" placeholder="e.g. AWS invoice — July 2026" />
      </div>

      {kind === "FILE" ? (
        <div>
          <label className="label">File (PDF, image, etc.)</label>
          <input className="input" type="file" name="file" />
        </div>
      ) : (
        <div>
          <label className="label">Link (Google Drive, vendor portal…)</label>
          <input className="input" name="externalUrl" placeholder="https://…" />
        </div>
      )}

      <button className="btn-primary" type="submit">Attach document</button>
    </form>
  );
}

export function DeleteDocButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (confirm("Remove this document?")) start(() => deleteDocument(id));
      }}
    >
      Remove
    </button>
  );
}
