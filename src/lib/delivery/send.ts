import { resend } from "../config";

export interface EmailAttachment {
  filename: string;
  content: string;
  content_id: string;
}

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export interface SendResult {
  ok: boolean;
  detail: string;
}

export async function sendEmail(input: EmailInput): Promise<SendResult> {
  if (!resend.apiKey) {
    return { ok: false, detail: "RESEND_API_KEY is not set" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resend.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.attachments ? { attachments: input.attachments } : {}),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, detail: `Email HTTP ${response.status} ${text.slice(0, 200)}` };
    }
    return { ok: true, detail: "accepted by Resend" };
  } catch (error) {
    return { ok: false, detail: `Email request failed: ${String(error).slice(0, 200)}` };
  }
}
