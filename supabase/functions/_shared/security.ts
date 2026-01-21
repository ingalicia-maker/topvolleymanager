/**
 * Shared security utilities for Edge Functions
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting (per instance - for basic protection)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiting for edge functions
 * Note: This is per-instance and resets on cold starts. For production,
 * consider using a distributed store like Redis or Supabase.
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  return { allowed: true, remaining, resetIn: entry.resetTime - now };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== "string") return "";
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, "") // Basic XSS prevention
    .trim();
}

/**
 * Check for suspicious patterns in input
 */
export function hasSuspiciousPatterns(input: string): boolean {
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /insert\s+into/i,
    /drop\s+table/i,
  ];
  return patterns.some((p) => p.test(input));
}

/**
 * Validate request origin
 */
export function isValidOrigin(req: Request, allowedOrigins: string[]): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // Allow requests without origin (e.g., server-to-server)
  return allowedOrigins.some((allowed) => {
    if (allowed === "*") return true;
    return origin === allowed || origin.endsWith(allowed.replace("*", ""));
  });
}

/**
 * Create rate-limited error response
 */
export function rateLimitResponse(resetIn: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": Math.ceil(resetIn / 1000).toString(),
      },
    }
  );
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Create bad request response
 */
export function badRequestResponse(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  req: Request,
  details?: Record<string, unknown>
): void {
  console.warn(`[SECURITY] ${event}`, {
    ip: getClientIP(req),
    userAgent: req.headers.get("user-agent"),
    origin: req.headers.get("origin"),
    ...details,
  });
}
