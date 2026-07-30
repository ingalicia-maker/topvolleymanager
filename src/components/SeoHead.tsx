import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE = "https://www.topvolleymanager.com";
const LANGS = ["es", "en", "it"] as const;

/**
 * Internal / private application routes. Everything under these prefixes is
 * served behind auth (or is a utility route) and must never be indexed.
 */
const NOINDEX_PREFIXES = [
  "/auth",
  "/reset-password",
  "/invitation",
  "/inv",
  "/admin",
  "/club-onboarding",
  "/club-settings",
  "/club-management",
  "/coach-management",
  "/blog-admin",
  "/resources-admin",
  "/newsletter-admin",
  "/exercises",
  "/teams",
  "/players",
  "/events",
  "/ausencias",
  "/profile",
  "/ratings",
  "/displacements",
  "/pending-tasks",
  "/weekly-summary",
  "/messages",
  "/subscription",
  "/seasons",
];

/**
 * Routes whose own page component already renders canonical/hreflang via
 * <Helmet>. Helmet does NOT dedupe <link> tags, so we must not emit a second one.
 */
function pageOwnsCanonical(pathname: string) {
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return true;
  if (pathname === "/resources" || pathname === "/exercises") return true;
  const seg = pathname.split("/")[1];
  return (LANGS as readonly string[]).includes(seg) && pathname.split("/").length === 2;
}

export function isNoIndexRoute(pathname: string) {
  // Root "/" is the authenticated dashboard (unauthenticated users are
  // redirected to /es|/en|/it), so it must not be indexed.
  if (pathname === "/") return true;
  return NOINDEX_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function SeoHead() {
  const { pathname } = useLocation();
  const noindex = isNoIndexRoute(pathname);
  const clean = pathname !== "/" && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;

  return (
    <Helmet>
      <meta name="robots" content={noindex ? "noindex, follow" : "index, follow"} />
      {!noindex && !pageOwnsCanonical(clean) && (
        <link rel="canonical" href={`${SITE}${clean}`} />
      )}
    </Helmet>
  );
}
