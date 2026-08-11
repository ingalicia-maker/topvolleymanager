import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REVENUECAT-WEBHOOK] ${step}${detailsStr}`);
};

// Priority order when a user holds more than one active entitlement at once.
const TIER_PRIORITY = ["elite", "pro", "starter"] as const;
type Tier = typeof TIER_PRIORITY[number];

const ACTIVE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
]);
const INACTIVE_EVENTS = new Set(["EXPIRATION"]);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (webhookSecret) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${webhookSecret}`) {
      logStep("Rejected: invalid Authorization header");
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const payload = await req.json();
    const event = payload.event;
    if (!event) throw new Error("Missing event in payload");

    const userId: string = event.app_user_id;
    const eventType: string = event.type;
    const entitlementIds: string[] = event.entitlement_ids ?? (event.entitlement_id ? [event.entitlement_id] : []);

    logStep("Received event", { eventType, userId, entitlementIds });

    // Only touch our own users (RevenueCat's anonymous IDs won't match a real UUID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId ?? "");
    if (!isUuid) {
      logStep("Skipping: app_user_id is not a Supabase user id", { userId });
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    let status: Tier | "free" | null = null;

    if (INACTIVE_EVENTS.has(eventType)) {
      status = "free";
    } else if (ACTIVE_EVENTS.has(eventType)) {
      status = TIER_PRIORITY.find(tier => entitlementIds.includes(tier)) ?? null;
      if (!status) {
        logStep("No matching tier entitlement in event, ignoring", { entitlementIds });
        return new Response(JSON.stringify({ skipped: true }), { status: 200 });
      }
    } else {
      // CANCELLATION (still entitled until expiration), BILLING_ISSUE, TRANSFER, etc.
      // don't change access on their own — wait for EXPIRATION or the next renewal.
      logStep("Event does not change entitlement, ignoring", { eventType });
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const { error } = await supabase
      .from("user_subscriptions")
      .upsert(
        { user_id: userId, status, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw error;

    logStep("Updated user_subscriptions", { userId, status });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
});
