import { NextResponse } from "next/server";
import { listPersonas } from "../../../lib/persona-store";

export async function GET() {
  const personas = await listPersonas().catch(() => null);

  if (!personas) {
    return NextResponse.json({ error: "Persona data not found." }, { status: 500 });
  }

  return NextResponse.json({ personas });
}
