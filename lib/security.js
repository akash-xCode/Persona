import crypto from "node:crypto";

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const MAX_MESSAGE_LENGTH = 800;
const BLOCKED_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /show\s+(the\s+)?hidden\s+prompt/i,
  /api\s*key/i,
  /secret/i,
  /env/i,
  /developer\s+message/i,
  /raw\s+transcript/i,
  /dump\s+all\s+context/i
];

function getSessionToken() {
  const secret = process.env.SESSION_SECRET || "local-dev-secret";
  const passcode = process.env.APP_PASSCODE || "cohort-demo";
  return crypto.createHmac("sha256", secret).update(passcode).digest("hex");
}

export function createSessionCookie() {
  return getSessionToken();
}

export function isValidSession(cookieValue) {
  return Boolean(cookieValue) && cookieValue === getSessionToken();
}

export function getCookieValue(cookieHeader, key) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${key}=`)) {
      return cookie.slice(key.length + 1);
    }
  }
  return null;
}

export function enforceRateLimit(identifier) {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now - entry.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(identifier, { count: 1, startedAt: now });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - entry.startedAt) };
  }

  entry.count += 1;
  return { allowed: true };
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "local";
}

export function assertAllowedOrigin(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  return origin.endsWith(host);
}

export function validateMessage(message) {
  const normalized = typeof message === "string" ? message.trim() : "";

  if (!normalized) {
    return { ok: false, error: "Message cannot be empty." };
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message is too long. Keep it under ${MAX_MESSAGE_LENGTH} characters.` };
  }

  return { ok: true, value: normalized };
}

export function detectPromptInjection(text) {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

export function enforceFiveLineLimit(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  const joined = lines.join("\n");
  return joined.length > 450 ? `${joined.slice(0, 447).trim()}...` : joined;
}

export function normalizePersonaReply(text, personaId) {
  let normalized = text.trim();

  if (personaId === "hitesh") {
    normalized = normalized
      .replace(/\bDekh\b/gu, "Dekho")
      .replace(/\bdekh\b/gu, "dekho");
  }

  return normalized;
}

export function isIntroductionQuestion(text) {
  const normalized = text.trim().toLowerCase();
  const patterns = [
    /tell me about yourself/,
    /introduce yourself/,
    /who are you/,
    /about yourself/,
    /apne bare me batao/,
    /apne baare me batao/,
    /aap apne bare me batao/,
    /aap apne baare me batao/,
    /aap kaun ho/,
    /ap kaun ho/,
    /khud ke bare me batao/,
    /khud ke baare me batao/
  ];

  return patterns.some((pattern) => pattern.test(normalized));
}
