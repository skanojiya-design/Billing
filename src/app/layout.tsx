import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROQIT Billing",
  description: "Internal payment & asset tracker — vendors, monthly payments, IoT device procurement, documents & alerts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
