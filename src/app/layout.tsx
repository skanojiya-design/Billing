import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "roqit Billing",
  description: "Internal recurring-payment tracker — vendors, monthly payments, documents & alerts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
