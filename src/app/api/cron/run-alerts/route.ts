import { NextRequest, NextResponse } from "next/server";
import { runAlerts } from "@/lib/alerts";
import { flushOutbox } from "@/lib/email";

// Public-ish endpoint for an external scheduler (cron, GitHub Action, Vercel Cron)
// to trigger the alert run. Protect it with a shared secret set in CRON_SECRET.
// Two ways to authenticate (either is accepted):
//   - query string:      GET /api/cron/run-alerts?key=YOUR_SECRET
//   - Authorization head: Authorization: Bearer YOUR_SECRET
// Vercel Cron automatically sends the Bearer header when CRON_SECRET is set, so
// the scheduled job in vercel.json needs no secret embedded in the repo.
// If CRON_SECRET is unset, the endpoint is open (fine for local development).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const required = process.env.CRON_SECRET;
  if (required) {
    const key = req.nextUrl.searchParams.get("key");
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (key !== required && bearer !== required) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const alerts = await runAlerts();
  const flush = await flushOutbox();
  return NextResponse.json({ ok: true, ...alerts, ...flush });
}
