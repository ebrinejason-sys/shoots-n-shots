import type { DeliveryChannel } from "./types";

// Default channel: prints the ticket link so the flow is demoable with no
// messaging account.
export const consoleChannel: DeliveryChannel = {
  name: "console",
  async send(message) {
    const links = message.tickets.map((ticket) => ticket.ticketUrl).join(", ");
    console.log(
      `[delivery:console] ${message.customerName} <${message.phone}> → ${links}`,
    );
    return { ok: true, detail: "logged to server console" };
  },
};
