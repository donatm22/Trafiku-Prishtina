import { NextResponse } from "next/server";
import { createTrafficReport, listTrafficReports } from "../../../db/traffic-store";
import { INCIDENT_TYPES, type IncidentType, type TrafficReport } from "../../../lib/traffic";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ reports: await listTrafficReports() });
  } catch {
    return NextResponse.json({ error: "Raportimet nuk mund të ngarkohen për momentin." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: Partial<TrafficReport>;
  try {
    body = await request.json() as Partial<TrafficReport>;
  } catch {
    return NextResponse.json({ error: "Të dhënat nuk janë valide." }, { status: 400 });
  }

  const type = body.type as IncidentType;
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const severity = body.severity;
  const title = String(body.title ?? "").trim().slice(0, 100);
  const description = String(body.description ?? "").trim().slice(0, 400);
  const locationName = String(body.locationName ?? "").trim().slice(0, 120);

  if (
    !(type in INCIDENT_TYPES) ||
    !["low", "medium", "high"].includes(String(severity)) ||
    title.length < 4 ||
    locationName.length < 2 ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 42.55 ||
    latitude > 42.75 ||
    longitude < 21.03 ||
    longitude > 21.30
  ) {
    return NextResponse.json({ error: "Kontrollo llojin, vendndodhjen dhe përshkrimin e raportimit." }, { status: 422 });
  }

  try {
    const report = await createTrafficReport({
      type,
      title,
      description,
      locationName,
      latitude,
      longitude,
      severity: severity as TrafficReport["severity"],
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Raportimi nuk u ruajt. Provo përsëri." }, { status: 503 });
  }
}
