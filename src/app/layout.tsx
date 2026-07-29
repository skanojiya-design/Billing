import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "roqit Billing",
  description: "Subscriptions, pay-as-you-go, one-time payments, invoices, approvals & alerts — one app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
