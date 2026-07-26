import { NextResponse } from "next/server";
import { confirmTrafficReport } from "../../../../../db/traffic-store";
import { getPrishtinaUser } from "../../../../../lib/prishtina-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getPrishtinaUser(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Kyçu me llogarinë Prishtina.online për të konfirmuar." }, { status: 401 });
  }
  const { id } = await context.params;
  if (!id || id.length > 80) {
    return NextResponse.json({ error: "Raportimi nuk është valid." }, { status: 400 });
  }

  try {
    const confirmations = await confirmTrafficReport(id);
    if (confirmations === null) {
      return NextResponse.json({ error: "Raportimi nuk është më aktiv." }, { status: 404 });
    }
    return NextResponse.json({ confirmations });
  } catch {
    return NextResponse.json({ error: "Konfirmimi nuk u ruajt." }, { status: 503 });
  }
}
