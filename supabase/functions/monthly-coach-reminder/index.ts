import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all club members (coaches and directors)
    const { data: members, error: membersError } = await supabase
      .from("club_members")
      .select("user_id, role, club_id");

    if (membersError) {
      throw new Error(`Error fetching members: ${membersError.message}`);
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let notificationsCreated = 0;

    for (const member of members || []) {
      // Check if notification already sent this month
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("recipient_id", member.user_id)
        .eq("type", "monthly_reminder")
        .gte("created_at", `${currentMonth}-01T00:00:00Z`)
        .maybeSingle();

      if (existing) continue;

      // Create monthly reminder notification
      await supabase.from("notifications").insert({
        recipient_id: member.user_id,
        sender_id: null,
        type: "monthly_reminder",
        title: "Recordatorio mensual",
        message:
          "Es momento de revisar las ausencias del mes y valorar el progreso de tus jugadoras. ¡No olvides puntuar a cada una!",
        is_read: false,
      });

      notificationsCreated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: notificationsCreated,
        month: currentMonth,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in monthly-coach-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
