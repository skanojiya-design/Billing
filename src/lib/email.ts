import { prisma } from "./db";
import type { EmailType } from "./constants";

// SIMULATED email. Instead of sending, we persist messages to the EmailOutbox
// table so the whole flow (compose -> queue -> "send") is visible in the UI.
// To go live later, replace `deliver()` with a real transport (SendGrid, SES,
// nodemailer/SMTP) — nothing else needs to change.

type QueueArgs = {
  toEmail: string;
  toName?: string | null;
  subject: string;
  body: string;
  type: EmailType;
  entryId?: string | null;
};

export async function queueEmail(args: QueueArgs) {
  return prisma.emailOutbox.create({
    data: {
      toEmail: args.toEmail,
      toName: args.toName ?? null,
      subject: args.subject,
      body: args.body,
      type: args.type,
      entryId: args.entryId ?? null,
      status: "QUEUED",
    },
  });
}

// Pretend to deliver a single message. Always "succeeds" in simulation mode.
async function deliver(_toEmail: string, _subject: string, _body: string): Promise<void> {
  // Replace with a real provider call to go live. Example:
  //   await sgMail.send({ to, from, subject, text: body });
  return;
}

/** "Send" every queued email. Returns how many were processed. */
export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  const queued = await prisma.emailOutbox.findMany({
    where: { status: "QUEUED", scheduledFor: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
  });

  let sent = 0;
  let failed = 0;
  for (const msg of queued) {
    try {
      await deliver(msg.toEmail, msg.subject, msg.body);
      await prisma.emailOutbox.update({
        where: { id: msg.id },
        data: { status: "SENT", sentAt: new Date(), error: null },
      });
      sent++;
    } catch (e) {
      await prisma.emailOutbox.update({
        where: { id: msg.id },
        data: { status: "FAILED", error: e instanceof Error ? e.message : String(e) },
      });
      failed++;
    }
  }
  return { sent, failed };
}
