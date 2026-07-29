// Central definition of every "enum-like" value. Because SQLite stores these as
// plain strings, keeping the allowed values + labels here is what keeps the app
// consistent and makes a future move to Postgres enums painless.

export const ROLES = ["ADMIN", "APPROVER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  APPROVER: "Approver",
  VIEWER: "Viewer",
};

export const TRANSACTION_TYPES = ["SUBSCRIPTION", "PAY_AS_YOU_GO", "ONE_TIME"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  SUBSCRIPTION: "Subscription",
  PAY_AS_YOU_GO: "Pay as you go",
  ONE_TIME: "One-time",
};

export const TRANSACTION_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "INVOICED",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  INVOICED: "Invoiced",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export const INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "VOID",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
};

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "CANCELLED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INTERVALS = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type Interval = (typeof INTERVALS)[number];
export const INTERVAL_LABELS: Record<Interval, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};
export const INTERVAL_MONTHS: Record<Interval, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
};

export const PAYMENT_METHODS = ["BANK_TRANSFER", "UPI", "CARD", "CASH", "CHEQUE", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Bank transfer",
  UPI: "UPI",
  CARD: "Card",
  CASH: "Cash",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export const EMAIL_TYPES = ["DUE_SOON", "OVERDUE", "INVOICE_SENT", "APPROVAL_REQUEST", "GENERIC"] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

// Tailwind classes for status badges, keyed by status value.
export const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  INVOICED: "bg-indigo-100 text-indigo-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-500",
  SENT: "bg-blue-100 text-blue-800",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800",
  VOID: "bg-gray-100 text-gray-500",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-gray-100 text-gray-500",
  QUEUED: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-800",
};
