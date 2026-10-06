import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Stripe Connect webhook ("Events on connected accounts"):
// - checkout.session.completed / async_payment_succeeded: marks the club fee payment as paid.
// - account.updated: keeps "can take payments" in sync for the club.
// Signed with STRIPE_CONNECT_WEBHOOK_SECRET.

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET");
  if (!signature || !secret) return new Response("Missing signature", { status: 400 });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch (error) {
    console.error("[STRIPE-CONNECT-WEBHOOK] bad signature", error);
    return new Response("Bad signature", { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const chargeId = session.metadata?.fee_charge_id;
      if (chargeId && session.payment_status === "paid") {
        const { data: charge } = await admin.from("fee_charges")
          .select("id, amount, club_id, status").eq("id", chargeId).maybeSingle();
        const { data: settings } = charge
          ? await admin.from("club_fee_settings").select("stripe_account_id").eq("club_id", charge.club_id).maybeSingle()
          : { data: null };
        // Only for the club's own account and the exact amount of that payment
        if (charge && charge.status === "pending" && settings?.stripe_account_id === event.account
            && session.amount_total === Math.round(Number(charge.amount) * 100)) {
          await admin.from("fee_charges").update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_method: "Stripe",
            stripe_session_id: session.id,
          }).eq("id", charge.id);
        }
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      await admin.from("club_fee_settings")
        .update({ stripe_charges_enabled: !!account.charges_enabled })
        .eq("stripe_account_id", account.id);
    }
  } catch (error) {
    console.error("[STRIPE-CONNECT-WEBHOOK]", error);
    return new Response("Error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
