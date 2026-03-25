/**
 * Security utilities for anti-bot protection and input validation
 */

// Rate limiting using sessionStorage (client-side, soft protection)
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const RATE_LIMIT_STORAGE_KEY = 'tvm_rate_limits';

function getRateLimits(): Record<string, RateLimitEntry> {
  try {
    const data = sessionStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setRateLimits(limits: Record<string, RateLimitEntry>): void {
  try {
    sessionStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(limits));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Client-side rate limiting (soft protection, real protection is server-side)
 * Returns { allowed: boolean, retryAfterMs: number }
 */
export function checkRateLimit(
  action: string,
  maxAttempts: number = 5,
  windowMs: number = 60000, // 1 minute
  blockDurationMs: number = 300000 // 5 minutes block
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const limits = getRateLimits();
  const entry = limits[action];

  // Check if currently blocked
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, retryAfterMs: entry.blockedUntil - now };
  }

  // Reset if window expired
  if (!entry || now - entry.firstAttempt > windowMs) {
    limits[action] = { count: 1, firstAttempt: now };
    setRateLimits(limits);
    return { allowed: true, retryAfterMs: 0 };
  }

  // Increment count
  entry.count++;
  
  // Check if exceeded
  if (entry.count > maxAttempts) {
    entry.blockedUntil = now + blockDurationMs;
    setRateLimits(limits);
    return { allowed: false, retryAfterMs: blockDurationMs };
  }

  setRateLimits(limits);
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Reset rate limit for an action (e.g., after successful login)
 */
export function resetRateLimit(action: string): void {
  const limits = getRateLimits();
  delete limits[action];
  setRateLimits(limits);
}

/**
 * Honeypot validation - returns true if honeypot field is filled (bot detected)
 */
export function isHoneypotFilled(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

/**
 * Time-based validation - returns true if form was submitted too quickly (bot behavior)
 */
export function isSubmittedTooQuickly(startTimestamp: number, minTimeMs: number = 2000): boolean {
  return Date.now() - startTimestamp < minTimeMs;
}

/**
 * Validate common patterns in user input to detect suspicious content
 */
export function containsSuspiciousPatterns(input: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /union\s+select/i,
    /insert\s+into/i,
    /drop\s+table/i,
    /--\s*$/,
    /;\s*drop/i,
    /\x00/, // null bytes
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize user input for display (basic XSS prevention)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Generate a CSRF-like token for form submissions
 */
export function generateFormToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store form token in sessionStorage
 */
export function storeFormToken(formId: string, token: string): void {
  try {
    sessionStorage.setItem(`tvm_form_${formId}`, token);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Validate form token from sessionStorage
 */
export function validateFormToken(formId: string, token: string): boolean {
  try {
    const storedToken = sessionStorage.getItem(`tvm_form_${formId}`);
    if (storedToken && storedToken === token) {
      sessionStorage.removeItem(`tvm_form_${formId}`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Log security event (for monitoring)
 */
export function logSecurityEvent(event: string, details?: Record<string, unknown>): void {
  // In production, this could send to a logging service
  if (import.meta.env.DEV) {
    console.warn(`[SECURITY] ${event}`, details);
  }
}
