import { NextResponse } from "next/server";
import { clearTrafficReport } from "../../../../../db/traffic-store";
import { isTrustedMutation } from "../../../../../lib/request-security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Kërkesa nuk u lejua." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id || id.length > 80) {
    return NextResponse.json({ error: "Raportimi nuk është valid." }, { status: 400 });
  }

  try {
    const lifecycle = await clearTrafficReport(id);
    if (lifecycle === null) {
      return NextResponse.json({ error: "Raportimi nuk është më aktiv." }, { status: 404 });
    }
    return NextResponse.json(lifecycle);
  } catch {
    return NextResponse.json({ error: "Vota për mbyllje nuk u ruajt." }, { status: 503 });
  }
}
