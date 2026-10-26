import { Resend } from "resend";

export type EmailAttachment = { filename: string; content: Buffer };

export type SendEmailInput = {
  to: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

const DEFAULT_FROM = "Seissense Ops <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Sends one email through Resend. Throws on failure so callers can log/report it. */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("Email is not configured (RESEND_API_KEY)");

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  });
  if (error || !data) throw new Error(error?.message ?? "Resend returned no result");
  return { id: data.id };
}
