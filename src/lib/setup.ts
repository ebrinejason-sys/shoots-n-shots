import { APP_URL, deliveryChannels, MOCK_PAYMENTS, resend } from "./config";

export interface SetupItem {
  key: string;
  label: string;
  detail: string;
  done: boolean;
}

const DEV_DEFAULTS = new Set([
  "",
  "dev-only-insecure-cookie-secret-change-me",
  "dev-only-insecure-ticket-secret-change-me",
]);

function hostOf(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function isLocal(host: string): boolean {
  return host === "" || host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/**
 * Booleans and hosts only — never the values of secrets. Rendered on the admin
 * page so a deployment can be checked at a glance.
 */
export function getSetupStatus(): SetupItem[] {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const databaseHost = hostOf(databaseUrl);
  const appHost = hostOf(APP_URL);

  return [
    {
      key: "DATABASE_URL",
      label: "Database",
      detail: databaseUrl
        ? isLocal(databaseHost)
          ? "Local Postgres — swap in your Supabase pooler string before deploying"
          : `Hosted Postgres · ${databaseHost}`
        : "Not set — using the local development default",
      done: Boolean(databaseUrl) && !isLocal(databaseHost),
    },
    {
      key: "APP_URL",
      label: "Public URL",
      detail: isLocal(appHost)
        ? "Still localhost — set it to your deployed HTTPS origin"
        : APP_URL,
      done: !isLocal(appHost) && APP_URL.startsWith("https://"),
    },
    {
      key: "MOCK_PAYMENTS",
      label: "Live payments",
      detail: MOCK_PAYMENTS
        ? "Mock mode — set MOCK_PAYMENTS=false to charge real money"
        : "Flutterwave checkout is live",
      done: !MOCK_PAYMENTS,
    },
    {
      key: "FLUTTERWAVE_SECRET_KEY",
      label: "Flutterwave secret key",
      detail: process.env.FLUTTERWAVE_SECRET_KEY
        ? "Set — checkout can be created"
        : "Missing — checkout cannot be started",
      done: Boolean(process.env.FLUTTERWAVE_SECRET_KEY),
    },
    {
      key: "FLUTTERWAVE_WEBHOOK_SECRET",
      label: "Flutterwave webhook hash",
      detail: process.env.FLUTTERWAVE_WEBHOOK_SECRET
        ? "Set — webhook signatures will be checked"
        : "Missing — payments confirmed only by the browser return",
      done: Boolean(process.env.FLUTTERWAVE_WEBHOOK_SECRET),
    },
    {
      key: "RESEND_API_KEY",
      label: "Email delivery (Resend)",
      detail: process.env.RESEND_API_KEY
        ? `On — QR codes are emailed from ${resend.from}`
        : "Missing — customers will not receive their QR by email",
      done: Boolean(process.env.RESEND_API_KEY) && deliveryChannels.includes("email"),
    },
    {
      key: "TICKET_SECRET",
      label: "Ticket secret",
      detail: DEV_DEFAULTS.has(process.env.TICKET_SECRET ?? "")
        ? "Using the development placeholder — generate a long random value"
        : "Set — ticket links are signed with your own secret",
      done: !DEV_DEFAULTS.has(process.env.TICKET_SECRET ?? ""),
    },
    {
      key: "COOKIE_SECRET",
      label: "Staff session secret",
      detail: DEV_DEFAULTS.has(process.env.COOKIE_SECRET ?? "")
        ? "Using the development placeholder — generate a long random value"
        : "Set — staff sessions are signed with your own secret",
      done: !DEV_DEFAULTS.has(process.env.COOKIE_SECRET ?? ""),
    },
  ];
}
