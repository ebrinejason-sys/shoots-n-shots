import { resolveAppUrl } from "./app-url";
import { sendEmail } from "./delivery/send";
import type { SendResult } from "./delivery/send";

export interface InviteEmail {
  subject: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildInviteEmail(input: {
  name: string;
  email: string;
  temporaryPassword: string;
  appUrl: string;
}): InviteEmail {
  const signInUrl = `${input.appUrl.replace(/\/+$/, "")}/admin/login`;

  const html = `
    <div style="font-family:Georgia,serif;max-width:540px;color:#141210">
      <p style="margin:0;font:11px/1.4 system-ui,sans-serif;letter-spacing:0.22em;text-transform:uppercase;color:#6E6659">
        Shots &amp; Secrets
      </p>
      <h1 style="margin:8px 0 0;font-size:28px;line-height:1.15">Admin access</h1>
      <p style="margin:16px 0 0;font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">
        Hi ${escapeHtml(input.name)},
      </p>
      <p style="margin:8px 0 0;font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">
        You have been added as an admin. Sign in with the details below — you will be
        asked to choose your own password straight away.
      </p>

      <div style="margin:20px 0;padding:16px;border:1px solid #E0D8C9;background:#FCFAF4;font-family:system-ui,sans-serif;font-size:15px">
        <p style="margin:0 0 10px">
          <span style="display:block;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#6E6659">Email</span>
          ${escapeHtml(input.email)}
        </p>
        <p style="margin:0">
          <span style="display:block;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#6E6659">Temporary password</span>
          <code style="font-size:18px;letter-spacing:0.04em">${escapeHtml(input.temporaryPassword)}</code>
        </p>
      </div>

      <p style="margin:20px 0 0">
        <a href="${escapeHtml(signInUrl)}"
           style="display:inline-block;padding:12px 20px;background:#1F4B43;color:#FCFAF4;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none">
          Sign in
        </a>
      </p>
      <p style="margin:14px 0 0;font-family:system-ui,sans-serif;font-size:12px;color:#6E6659">
        Or open ${escapeHtml(signInUrl)}
      </p>
      <p style="margin:20px 0 0;font-family:system-ui,sans-serif;font-size:12px;color:#6E6659">
        This temporary password stops working the moment you choose your own.
        If you were not expecting this email, you can ignore it.
      </p>
    </div>`;

  return { subject: "Your admin access to Shots & Secrets", html };
}

export async function sendInvite(input: {
  name: string;
  email: string;
  temporaryPassword: string;
}): Promise<SendResult & { appUrl: string }> {
  const appUrl = await resolveAppUrl();
  const { subject, html } = buildInviteEmail({ ...input, appUrl });
  const result = await sendEmail({ to: input.email, subject, html });
  return { ...result, appUrl };
}
