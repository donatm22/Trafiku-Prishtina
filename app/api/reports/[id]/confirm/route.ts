import { NextResponse } from "next/server";
import { confirmTrafficReport } from "../../../../../db/traffic-store";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
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
