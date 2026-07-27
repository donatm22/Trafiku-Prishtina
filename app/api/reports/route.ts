import { NextResponse } from "next/server";
import { createTrafficReport, findDuplicateTrafficReports, listTrafficReports } from "../../../db/traffic-store";
import type { DuplicateTrafficReport } from "../../../lib/duplicate-detection";
import { getPrishtinaUser } from "../../../lib/prishtina-auth";
import { isTrustedMutation } from "../../../lib/request-security";
import { validateTrafficReport } from "../../../lib/traffic-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ reports: await listTrafficReports() });
  } catch {
    return NextResponse.json({ error: "Raportimet nuk mund të ngarkohen për momentin." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Kërkesa nuk u lejua." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Të dhënat nuk janë valide." }, { status: 400 });
  }

  const validated = validateTrafficReport(body);
  if (!validated.ok) {
    return NextResponse.json({ error: "Kontrollo llojin, vendndodhjen dhe përshkrimin e raportimit." }, { status: 422 });
  }

  try {
    const duplicateOverride = (body as Record<string, unknown>).duplicateOverride === true;
    const duplicates: DuplicateTrafficReport[] = await findDuplicateTrafficReports(validated.report);
    if (duplicates.length > 0 && !duplicateOverride) {
      return NextResponse.json({
        error: "Ka një raportim të ngjashëm afër kësaj pike.",
        duplicates,
      }, { status: 409 });
    }

    const user = await getPrishtinaUser(request.headers.get("cookie"));
    const report = await createTrafficReport(validated.report, user?.email ?? null);
    return NextResponse.json({ report }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Raportimi nuk u ruajt. Provo përsëri." }, { status: 503 });
  }
}
