import { headers } from "next/headers";
import { APP_URL } from "./config";

/**
 * The origin a phone should use to open a ticket. When APP_URL is set it wins
 * (needed for emails and webhooks, which have no request context); otherwise
 * derive it from the incoming request so a LAN address is not baked into QR
 * codes as `localhost`.
 */
export async function resolveAppUrl(): Promise<string> {
  if (process.env.APP_URL) return APP_URL;

  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host");
  if (!host) return APP_URL;

  const proto =
    store.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${proto}://${host}`.replace(/\/+$/, "");
}
