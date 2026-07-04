import { NextResponse } from "next/server";
import { assertAllowedOrigin, createSessionCookie } from "../../../lib/security";

export async function POST(request) {
  if (!assertAllowedOrigin(request)) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const passcode = body?.passcode?.trim();
  const expected = process.env.APP_PASSCODE || "cohort-demo";

  if (!passcode || passcode !== expected) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("persona_session", createSessionCookie(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return response;
}

