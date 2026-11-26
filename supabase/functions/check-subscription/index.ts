import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Recurring Stripe prices -> tier (same ids as create-checkout).
const PRICE_TO_STATUS: Record<string, string> = {
  "price_1SnbIBPNqf8w4NJDicwJvJGT": "starter",
  "price_1SnbLGPNqf8w4NJD5miilpCr": "starter",
  "price_1SpmIOPNqf8w4NJD3g8i1ccv": "pro",
  "price_1SpmKNPNqf8w4NJDGjMrUJpd": "pro",
};
const TIER_RANK: Record<string, number> = { starter: 1, pro: 2, elite: 3 };
const SEASON_MS = 365 * 24 * 60 * 60 * 1000;

// Writes what Stripe says into user_subscriptions, the table the app reads.
// `status` is only touched when Stripe owns it (status_source = 'stripe'), so a
// subscription bought in the App Store / Google Play is never downgraded here.
async function syncToDb(
  db: ReturnType<typeof createClient>,
  userId: string,
  recurringTier: string | null,
  pass: { tier: string; until: string } | null,
) {
  const { data: row } = await db.from("user_subscriptions")
    .select("status, status_source, pass_tier, pass_until")
    .eq("user_id", userId).maybeSingle();
  const patch: Record<string, unknown> = {};

  if (recurringTier) {
    if (row?.status !== recurringTier && row?.status !== "vip") {
      patch.status = recurringTier;
      patch.status_source = "stripe";
    }
  } else if (row?.status_source === "stripe" && row.status !== "free") {
    patch.status = "free";
  }

  if (pass && (!row?.pass_until || new Date(pass.until) > new Date(row.pass_until))) {
    patch.pass_tier = pass.tier;
    patch.pass_until = pass.until;
  }

  if (!Object.keys(patch).length) return;
  patch.updated_at = new Date().toISOString();
  const { error } = row
    ? await db.from("user_subscriptions").update(patch).eq("user_id", userId)
    : await db.from("user_subscriptions").insert({ user_id: userId, status: "free", ...patch });
  if (error) logStep("DB sync failed", { message: error.message });
  else logStep("DB synced", patch);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      await syncToDb(supabaseClient, user.id, null, null);
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let priceId = null;
    let subscriptionEnd = null;
    let interval = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product;
      priceId = subscription.items.data[0].price.id;
      interval = subscription.items.data[0].price.recurring?.interval;
      logStep("Active subscription found", { subscriptionId: subscription.id, interval, endDate: subscriptionEnd });
    } else {
      logStep("No active subscription found");
    }

    // Season passes: paid one-time checkouts, valid 12 months from payment.
    let pass: { tier: string; until: string } | null = null;
    const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
    for (const s of sessions.data) {
      const tier = s.metadata?.season_tier;
      if (s.mode !== "payment" || s.payment_status !== "paid" || !tier) continue;
      const until = new Date(s.created * 1000 + SEASON_MS);
      if (until <= new Date()) continue;
      if (!pass || TIER_RANK[tier] > TIER_RANK[pass.tier] ||
          (TIER_RANK[tier] === TIER_RANK[pass.tier] && until > new Date(pass.until))) {
        pass = { tier, until: until.toISOString() };
      }
    }

    await syncToDb(supabaseClient, user.id, priceId ? (PRICE_TO_STATUS[priceId] ?? null) : null, pass);

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      price_id: priceId,
      interval: interval,
      subscription_end: subscriptionEnd,
      pass_tier: pass?.tier ?? null,
      pass_until: pass?.until ?? null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
