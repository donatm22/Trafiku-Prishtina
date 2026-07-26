import { NextResponse } from "next/server";
import { getPrishtinaUser } from "../../../../lib/prishtina-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getPrishtinaUser(request.headers.get("cookie"));
  const response = NextResponse.json({ user });
  response.headers.set("cache-control", "private, no-store, max-age=0");
  return response;
}
