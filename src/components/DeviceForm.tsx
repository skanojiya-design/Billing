"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDevice } from "@/app/actions";
import {
  DEVICE_STATUSES,
  DEVICE_STATUS_LABELS,
  DEVICE_CATEGORY_SUGGESTIONS,
  CURRENCIES,
} from "@/lib/constants";

type Option = { id: string; label: string };
export type DeviceInitial = {
  id?: string;
  purchaseId?: string | null;
  supplierId?: string | null;
  category?: string;
  make?: string | null;
  model?: string | null;
  serialNo?: string | null;
  imei?: string | null;
  assetTag?: string | null;
  cost?: number; // major units
  currency?: string;
  purchaseDate?: string;
  status?: string;
  notes?: string | null;
};

export function DeviceForm({
  device,
  suppliers,
  purchases,
  defaultPurchaseId,
  defaultSupplierId,
}: {
  device?: DeviceInitial;
  suppliers: Option[];
  purchases: Option[];
  defaultPurchaseId?: string;
  defaultSupplierId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveDevice(fd);
      if (res?.error) setError(res.error);
      // success → server action redirects to /devices
    });
  }

  const v = device ?? {};

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Category</label>
          <input className="input" name="category" list="device-categories" defaultValue={v.category ?? ""} placeholder="e.g. GPS Tracker" />
          <datalist id="device-categories">
            {DEVICE_CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" name="status" defaultValue={v.status ?? "IN_STOCK"}>
            {DEVICE_STATUSES.map((s) => <option key={s} value={s}>{DEVICE_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Make</label>
          <input className="input" name="make" defaultValue={v.make ?? ""} placeholder="e.g. Teltonika" />
        </div>
        <div>
          <label className="label">Model</label>
          <input className="input" name="model" defaultValue={v.model ?? ""} placeholder="e.g. FMB920" />
        </div>
        <div>
          <label className="label">Serial no.</label>
          <input className="input" name="serialNo" defaultValue={v.serialNo ?? ""} placeholder="unique per device" />
        </div>
        <div>
          <label className="label">IMEI</label>
          <input className="input" name="imei" defaultValue={v.imei ?? ""} />
        </div>
        <div>
          <label className="label">Asset tag</label>
          <input className="input" name="assetTag" defaultValue={v.assetTag ?? ""} />
        </div>
        <div>
          <label className="label">Purchase date</label>
          <input className="input" type="date" name="purchaseDate" defaultValue={v.purchaseDate ?? ""} />
        </div>
        <div>
          <label className="label">Cost</label>
          <input className="input" type="number" step="0.01" min="0" name="cost" defaultValue={v.cost ?? ""} />
        </div>
        <div>
          <label className="label">Currency</label>
          <select className="input" name="currency" defaultValue={v.currency ?? "INR"}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Supplier</label>
          <select className="input" name="supplierId" defaultValue={v.supplierId ?? defaultSupplierId ?? ""}>
            <option value="">— None —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Purchase</label>
          <select className="input" name="purchaseId" defaultValue={v.purchaseId ?? defaultPurchaseId ?? ""}>
            <option value="">— None —</option>
            {purchases.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input" name="notes" rows={2} defaultValue={v.notes ?? ""} />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-3">
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : v.id ? "Save changes" : "Add device"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.push("/devices")}>Cancel</button>
      </div>
    </form>
  );
}
