const trimSlash = (value: string) => value.replace(/\/+$/, "");

export const APP_URL = trimSlash(process.env.APP_URL ?? "http://localhost:3000");

export const MOCK_PAYMENTS = (process.env.MOCK_PAYMENTS ?? "true").toLowerCase() !== "false";

export const STAFF_PASSCODE = process.env.STAFF_PASSCODE ?? "staff1234";
export const COOKIE_SECRET =
  process.env.COOKIE_SECRET ?? "dev-only-insecure-cookie-secret-change-me";
export const TICKET_SECRET =
  process.env.TICKET_SECRET ?? "dev-only-insecure-ticket-secret-change-me";

export const flutterwave = {
  publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY ?? "",
  secretKey: process.env.FLUTTERWAVE_SECRET_KEY ?? "",
  webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET ?? "",
  baseUrl: trimSlash(process.env.FLUTTERWAVE_BASE_URL ?? "https://api.flutterwave.com"),
};

export const deliveryChannels = (process.env.DELIVERY_CHANNELS ?? "console")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export const PENDING_BOOKING_MINUTES = 20;

export const whatsapp = {
  token: process.env.WHATSAPP_TOKEN ?? "",
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  templateName: process.env.WHATSAPP_TEMPLATE_NAME ?? "",
  apiVersion: "v23.0",
};

export const africasTalking = {
  username: process.env.AT_USERNAME ?? "",
  apiKey: process.env.AT_API_KEY ?? "",
  senderId: process.env.AT_SENDER_ID ?? "",
};

export const resend = {
  apiKey: process.env.RESEND_API_KEY ?? "",
  from: process.env.EMAIL_FROM ?? "tickets@example.com",
};
