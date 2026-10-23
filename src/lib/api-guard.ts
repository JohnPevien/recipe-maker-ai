// Shared guard for the paid-LLM API routes: API key check first, then a
// per-IP rate limit, then input size caps. Buckets live in memory, so they
// are per server instance.
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_BUCKETS_BEFORE_SWEEP = 10_000;

export const MAX_PROMPT_CHARS = 2000;
export const MAX_MESSAGES = 50;
export const MAX_CHAT_BODY_CHARS = 20_000;

const buckets = new Map<string, { count: number; resetAt: number }>();

export class ValidationError extends Error {}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** 500 response when the server API key is missing, else null. Run first. */
export function checkApiKey(): Response | null {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('Missing DEEPSEEK_API_KEY environment variable');
    return Response.json({ error: 'Service unavailable' }, { status: 500 });
  }
  return null;
}

/** 429 response when the caller IP is over budget, else null. */
export function checkRateLimit(request: Request): Response | null {
  const now = Date.now();
  const ip = clientIp(request);
  if (buckets.size > MAX_BUCKETS_BEFORE_SWEEP) {
    buckets.forEach((bucket, key) => {
      if (now >= bucket.resetAt) buckets.delete(key);
    });
  }
  const bucket = buckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return Response.json(
      { error: 'Too many requests, please try again later' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }
  return null;
}

/** Throw ValidationError when a string prompt exceeds the cap. */
export function assertPromptLength(prompt: string): void {
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new ValidationError(`Prompt must be at most ${MAX_PROMPT_CHARS} characters`);
  }
}

/** Throw ValidationError when a chat messages array is oversized. */
export function assertMessagesSize(messages: unknown[]): void {
  if (messages.length > MAX_MESSAGES) {
    throw new ValidationError(`At most ${MAX_MESSAGES} messages are allowed`);
  }
  if (JSON.stringify(messages).length > MAX_CHAT_BODY_CHARS) {
    throw new ValidationError('Messages exceed the size limit');
  }
}

/**
 * Map a caught route error to a safe client response: 400 for client
 * mistakes, generic 500 for config/upstream failures (logged server-side).
 */
export function toErrorResponse(error: unknown, logPrefix: string): Response {
  if (error instanceof ValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
  console.error(logPrefix, error);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
