"use client";

import { useState, useTransition } from "react";

export type AlertRecipient = { id: string; name: string; email: string; role: string };

// "Run alerts now" with a visible recipient picker. Tick specific team members
// to send only to them; use Select all, or leave every box unchecked to fall
// back to the whole office team (all active Admins & Editors) — same as the
// scheduled daily run.
export function RunAlertsPanel({
  members,
  runAction,
}: {
  members: AlertRecipient[];
  runAction: (recipientUserIds: string[]) => Promise<{ message: string }>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string>("");

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const allSelected = members.length > 0 && selected.length === members.length;
  function toggleAll() {
    setSelected(allSelected ? [] : members.map((m) => m.id));
  }

  function run() {
    setMsg("");
    startTransition(async () => {
      try {
        const result = await runAction(selected);
        setMsg(result?.message ?? "Done.");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 sm:w-72">
      {members.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-2 p-2 text-left">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-xs font-medium text-muted">Recipients</span>
            <button type="button" onClick={toggleAll} className="text-xs text-brand-600 hover:underline dark:text-brand-400">
              {allSelected ? "Clear" : "Select all"}
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface">
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => toggle(m.id)}
                  className="h-4 w-4"
                />
                <span className="flex-1">
                  {m.name}
                  <span className="block text-xs text-faint">{m.email} · {m.role}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="px-1 pt-1 text-xs text-faint">
            {selected.length > 0
              ? `Will send to ${selected.length} selected member(s).`
              : "None selected — will send to all active Admins & Editors."}
          </p>
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        {msg && <span className="text-sm text-muted">{msg}</span>}
        <button className="btn-primary" onClick={run} disabled={pending}>
          {pending ? "Working…" : "Run alerts now"}
        </button>
      </div>
    </div>
  );
}
