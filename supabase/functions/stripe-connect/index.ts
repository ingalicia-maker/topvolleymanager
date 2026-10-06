import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Optional Stripe Connect for club fees. A club director links the club's own Stripe account
// (Stripe-hosted onboarding); afterwards families can pay each instalment by card.
// Actions: "onboard" (create/continue the account and return Stripe's onboarding link),
// "status" (refresh whether the account can take payments), "disconnect".

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SITE = "https://www.topvolleymanager.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { action, clubId } = await req.json().catch(() => ({}));
    if (typeof clubId !== "string") return json({ error: "clubId required" }, 400);

    // Only directors of that club
    const { data: member } = await admin.from("club_members").select("role")
      .eq("club_id", clubId).eq("user_id", user.id).maybeSingle();
    if (member?.role !== "director") return json({ error: "Forbidden" }, 403);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const { data: settings } = await admin.from("club_fee_settings").select("*").eq("club_id", clubId).maybeSingle();
    let accountId: string | null = settings?.stripe_account_id ?? null;

    const save = async (values: Record<string, unknown>) => {
      const { error } = await admin.from("club_fee_settings")
        .upsert({ club_id: clubId, ...values, updated_at: new Date().toISOString() }, { onConflict: "club_id" });
      if (error) throw error;
    };

    if (action === "disconnect") {
      await save({ stripe_account_id: null, stripe_charges_enabled: false });
      return json({ connected: false });
    }

    if (action === "status") {
      if (!accountId) return json({ connected: false, chargesEnabled: false });
      const account = await stripe.accounts.retrieve(accountId);
      await save({ stripe_charges_enabled: !!account.charges_enabled });
      return json({ connected: true, chargesEnabled: !!account.charges_enabled, detailsSubmitted: !!account.details_submitted });
    }

    if (action === "onboard") {
      if (!accountId) {
        const { data: club } = await admin.from("clubs").select("name").eq("id", clubId).single();
        // Club-owned account with its own full Stripe dashboard; Stripe fees are paid by the club.
        const account = await stripe.accounts.create({
          controller: {
            stripe_dashboard: { type: "full" },
            fees: { payer: "account" },
            losses: { payments: "stripe" },
            requirement_collection: "stripe",
          },
          business_profile: { name: club?.name ?? undefined, url: SITE },
          metadata: { club_id: clubId },
        });
        accountId = account.id;
        await save({ stripe_account_id: accountId, stripe_charges_enabled: false });
      }
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        refresh_url: `${SITE}/fees?stripe=refresh`,
        return_url: `${SITE}/fees?stripe=return`,
      });
      return json({ url: link.url });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("[STRIPE-CONNECT]", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
