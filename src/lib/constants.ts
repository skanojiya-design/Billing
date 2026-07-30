// Central definition of every "enum-like" value. Because SQLite stores these as
// plain strings, keeping the allowed values + labels here is what keeps the app
// consistent and makes a future move to Postgres enums painless.

// --- Access roles ----------------------------------------------------------
export const ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};
export const ROLE_HINTS: Record<Role, string> = {
  ADMIN: "Full access + manage team members",
  EDITOR: "Add/edit payments, mark paid, upload documents",
  VIEWER: "Read-only — can view & download documents",
};

// --- Vendor / service type --------------------------------------------------
export const VENDOR_TYPES = ["SUBSCRIPTION", "SERVICE"] as const;
export type VendorType = (typeof VENDOR_TYPES)[number];
export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  SUBSCRIPTION: "Subscription",
  SERVICE: "Service",
};

// --- Billing frequency ------------------------------------------------------
export const BILLING_FREQUENCIES = [
  "MONTHLY",
  "ANNUAL",
  "MONTHLY_USAGE",
  "PAY_AS_YOU_GO",
  "ONE_TIME",
] as const;
export type BillingFrequency = (typeof BILLING_FREQUENCIES)[number];
export const BILLING_FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  MONTHLY: "Monthly",
  ANNUAL: "Annual",
  MONTHLY_USAGE: "Monthly (Usage)",
  PAY_AS_YOU_GO: "Pay as you go",
  ONE_TIME: "One-time",
};

// --- Payment status ---------------------------------------------------------
export const ENTRY_STATUSES = ["PENDING", "PAID", "OVERDUE"] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];
export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

// --- Currencies -------------------------------------------------------------
export const CURRENCIES = ["INR", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
};

// --- Email alert types ------------------------------------------------------
export const EMAIL_TYPES = ["DUE_SOON", "OVERDUE", "GENERIC"] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

// --- Month helpers ----------------------------------------------------------
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// Tailwind classes for status badges, keyed by status value.
export const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-500",
  QUEUED: "bg-amber-100 text-amber-800",
  SENT: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};
