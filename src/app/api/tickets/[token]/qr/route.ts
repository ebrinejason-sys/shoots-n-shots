import { NextResponse } from "next/server";
import { resolveAppUrl } from "@/lib/app-url";
import { buildQrMatrix, qrToPng } from "@/lib/qr";
import { getTicketView } from "@/lib/scan";
import { TOKEN_PATTERN } from "@/lib/tickets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const view = await getTicketView(token);
  if (!view) {
    return new NextResponse("Not found", { status: 404 });
  }

  const appUrl = await resolveAppUrl();
  const png = qrToPng(buildQrMatrix(`${appUrl}/t/${token}`), {
    scale: 10,
    margin: 4,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
