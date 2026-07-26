import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "Kërkesa u refuzua." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("__Secure-prishtina.session-token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    domain: ".prishtina.online",
    expires: new Date(0),
  });
  response.cookies.set("prishtina.session-token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(0),
  });
  return response;
}
