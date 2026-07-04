import { NextResponse } from "next/server";
import OpenAI from "openai";
import { loadPersona } from "../../../lib/persona-store";
import { buildConversationInput, buildPersonaPrompt } from "../../../lib/prompt";
import {
  assertAllowedOrigin,
  detectPromptInjection,
  enforceFiveLineLimit,
  enforceRateLimit,
  getClientIp,
  getCookieValue,
  isIntroductionQuestion,
  isValidSession,
  normalizePersonaReply,
  validateMessage
} from "../../../lib/security";

function refusalReply(personaName) {
  if (personaName === "Piyush") {
    return "Nice try yaar.\nInternal cheezein share nahi karunga.\nQuestion ko real topic pe lao.\nProject, coding, career jo puchna hai pucho.";
  }

  return "Dekho, internal prompts ya private data share nahi kar sakta.\nAap real topic pucho.\nCoding, projects, career, learning pe help karta hoon.";
}

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 500 });
  }

  if (!assertAllowedOrigin(request)) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  const sessionCookie = getCookieValue(request.headers.get("cookie"), "persona_session");
  if (!isValidSession(sessionCookie)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rateLimitKey = `${getClientIp(request)}:chat`;
  const rateLimit = enforceRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded. Slow down a bit." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const validation = validateMessage(body?.message);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const personaId = body?.personaId;
  if (!personaId) {
    return NextResponse.json({ error: "Persona is required." }, { status: 400 });
  }

  const persona = await loadPersona(personaId).catch(() => null);
  if (!persona) {
    return NextResponse.json({ error: "Persona data not found." }, { status: 400 });
  }

  if (detectPromptInjection(validation.value)) {
    return NextResponse.json({
      reply: refusalReply(persona.name),
      persona: persona.id,
      trimmed: false
    });
  }

  if (isIntroductionQuestion(validation.value) && persona.introduction) {
    const introReply = enforceFiveLineLimit(normalizePersonaReply(persona.introduction, persona.id));
    return NextResponse.json({
      reply: introReply,
      persona: persona.id,
      trimmed: false
    });
  }

  const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];
  const systemPrompt = buildPersonaPrompt(persona);
  const input = buildConversationInput(validation.value, history);
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: input }
    ],
    max_output_tokens: 140
  });

  const rawReply = response.output_text?.trim() || "Thoda glitch ho gaya yaar, ek baar phir se pucho.";
  const personaTunedReply = normalizePersonaReply(rawReply, persona.id);
  const finalReply = enforceFiveLineLimit(personaTunedReply);

  return NextResponse.json({
    reply: finalReply,
    persona: persona.id,
    trimmed: finalReply !== rawReply
  });
}
