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

    const body = await req.json();
    const { newsletterId, trigger } = body;

    // If triggered by monthly cron, auto-generate a digest newsletter
    if (trigger === "monthly-cron") {
      // Get last 4 published English articles
      const { data: recentArticles } = await supabase
        .from("blog_articles")
        .select("title, slug, excerpt, published_at")
        .eq("is_published", true)
        .eq("language", "en")
        .order("published_at", { ascending: false })
        .limit(4);

      if (!recentArticles || recentArticles.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No recent articles to include" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const articleListHtml = recentArticles
        .map(
          (a: any) =>
            `<div style="margin-bottom:20px;padding:15px;border:1px solid #e5e7eb;border-radius:8px;">
              <h3 style="margin:0 0 8px;"><a href="https://topvolleymanager.com/blog/${a.slug}" style="color:#2563eb;text-decoration:none;">${a.title}</a></h3>
              <p style="margin:0;color:#6b7280;font-size:14px;">${a.excerpt || ""}</p>
            </div>`
        )
        .join("");

      const digestHtml = `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
          <div style="text-align:center;padding:20px;background:#2563eb;color:white;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;">🏐 Top Volley Manager</h1>
            <p style="margin:8px 0 0;">Monthly Newsletter</p>
          </div>
          <div style="padding:20px;">
            <h2>This Month's Best Articles</h2>
            ${articleListHtml}
            <div style="text-align:center;margin-top:30px;">
              <a href="https://topvolleymanager.com/blog" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Read More on Our Blog</a>
            </div>
          </div>
          <div style="padding:15px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;">
            <p>© ${new Date().getFullYear()} Top Volley Manager SL, Plaza Pontevedra 10, 2B, 15003 A Coruña</p>
          </div>
        </div>
      `;

      // Create and immediately send
      const { data: nl, error: nlErr } = await supabase
        .from("newsletters")
        .insert({
          subject: `🏐 Top Volley Manager - Monthly Newsletter (${new Date().toLocaleDateString("en", { month: "long", year: "numeric" })})`,
          content: digestHtml,
          status: "draft",
        })
        .select()
        .single();

      if (nlErr) throw nlErr;

      // Now send it (fall through to existing send logic)
      body.newsletterId = nl.id;
    }

    const finalNewsletterId = body.newsletterId || newsletterId;
    if (!finalNewsletterId) throw new Error("Newsletter ID required");

    // Get newsletter
    const { data: newsletter, error: nlError } = await supabase
      .from("newsletters")
      .select("*")
      .eq("id", finalNewsletterId)
      .single();
    if (nlError || !newsletter) throw new Error("Newsletter not found");

    // Parse content - support new JSON format with sections
    let emailHtml = newsletter.content;
    try {
      const parsed = JSON.parse(newsletter.content);
      if (parsed.html) {
        emailHtml = parsed.html;
      }
    } catch {
      // Legacy HTML content, use as-is
    }
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
