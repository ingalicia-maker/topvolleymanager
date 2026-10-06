import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Public: a family opens /pagar/<token> and this creates a Stripe Checkout session for that one
// instalment, on the club's own connected Stripe account. No account needed.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SITE = "https://www.topvolleymanager.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCALES = ["es", "en", "it"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, language } = await req.json().catch(() => ({}));
    if (typeof token !== "string" || !UUID.test(token)) return json({ error: "not_found" }, 404);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: charge } = await admin.from("fee_charges")
      .select("id, club_id, concept, amount, status, enrollments(player_name, guardian_email), clubs(name)")
      .eq("pay_token", token).maybeSingle();
    if (!charge) return json({ error: "not_found" }, 404);
    if (charge.status !== "pending") return json({ error: "not_pending" }, 409);

    const { data: settings } = await admin.from("club_fee_settings")
      .select("stripe_account_id, stripe_charges_enabled, currency").eq("club_id", charge.club_id).maybeSingle();
    if (!settings?.stripe_account_id || !settings.stripe_charges_enabled) return json({ error: "not_connected" }, 409);

    // deno-lint-ignore no-explicit-any
    const enrollment = (charge as any).enrollments;
    // deno-lint-ignore no-explicit-any
    const club = (charge as any).clubs;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: (settings.currency || "EUR").toLowerCase(),
          unit_amount: Math.round(Number(charge.amount) * 100),
          product_data: { name: `${charge.concept} · ${enrollment?.player_name ?? ""}`.slice(0, 250), description: club?.name },
        },
      }],
      customer_email: enrollment?.guardian_email ?? undefined,
      locale: LOCALES.includes(language) ? language : "auto",
      metadata: { fee_charge_id: charge.id },
      payment_intent_data: { metadata: { fee_charge_id: charge.id } },
      success_url: `${SITE}/pagar/${token}?status=paid`,
      cancel_url: `${SITE}/pagar/${token}`,
    }, { stripeAccount: settings.stripe_account_id });

    await admin.from("fee_charges").update({ stripe_session_id: session.id }).eq("id", charge.id);
    return json({ url: session.url });
  } catch (error) {
    console.error("[FEE-CHECKOUT]", error);
    return json({ error: "checkout_failed" }, 500);
  }
});
