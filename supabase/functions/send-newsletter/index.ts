import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verify the user is an admin
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin
    const { data: isAdmin } = await supabase.rpc("is_app_admin", { _email: user.email });
    if (!isAdmin) throw new Error("Not authorized");

    const { newsletterId } = await req.json();
    if (!newsletterId) throw new Error("Newsletter ID required");

    // Get newsletter
    const { data: newsletter, error: nlError } = await supabase
      .from("newsletters")
      .select("*")
      .eq("id", newsletterId)
      .single();
    if (nlError || !newsletter) throw new Error("Newsletter not found");
    if (newsletter.status === "sent") throw new Error("Newsletter already sent");

    // Get active subscribers
    const { data: subscribers } = await supabase
      .from("newsletter_subscribers")
      .select("email, language")
      .eq("is_active", true);

    // Get registered users' emails
    const { data: registrations } = await supabase
      .from("user_registrations")
      .select("email");

    // Combine unique emails
    const allEmails = new Set<string>();
    subscribers?.forEach((s: any) => allEmails.add(s.email.toLowerCase()));
    registrations?.forEach((r: any) => allEmails.add(r.email.toLowerCase()));

    const recipientList = Array.from(allEmails);
    let sentCount = 0;

    if (resendApiKey && recipientList.length > 0) {
      // Send in batches of 10
      for (let i = 0; i < recipientList.length; i += 10) {
        const batch = recipientList.slice(i, i + 10);
        
        for (const email of batch) {
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "Top Volley Manager <noreply@topvolleymanager.com>",
                to: [email],
                subject: newsletter.subject,
                html: newsletter.content,
              }),
            });

            if (res.ok) sentCount++;
          } catch (e) {
            console.error(`Error sending to ${email}:`, e);
          }
        }

        // Small delay between batches
        if (i + 10 < recipientList.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } else {
      sentCount = recipientList.length;
    }

    // Update newsletter status
    await supabase
      .from("newsletters")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: sentCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newsletterId);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
