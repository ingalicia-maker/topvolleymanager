import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-ACCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Safety check: block deletion if this user is the sole director of a club
    // that still has other members depending on it (they'd lose their director).
    const { data: directorRows, error: directorError } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("role", "director");
    if (directorError) throw directorError;

    for (const row of directorRows ?? []) {
      const { data: otherMembers, error: membersError } = await supabase
        .from("club_members")
        .select("user_id, role")
        .eq("club_id", row.club_id)
        .neq("user_id", user.id);
      if (membersError) throw membersError;

      const hasOtherDirector = (otherMembers ?? []).some(m => m.role === "director");
      const hasOtherMembers = (otherMembers ?? []).length > 0;

      if (hasOtherMembers && !hasOtherDirector) {
        logStep("Blocked: sole director of a club with other members", { clubId: row.club_id });
        return new Response(
          JSON.stringify({ error: "sole_director" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Detach audit-only references that would otherwise block deleteUser
    // (these columns have no ON DELETE action, so they must be nulled first).
    const detachTables: Array<{ table: string; column: string }> = [
      { table: "clubs", column: "created_by" },
      { table: "club_invitations", column: "created_by" },
      { table: "club_settings", column: "updated_by" },
      { table: "teams", column: "created_by" },
      { table: "events", column: "created_by" },
      { table: "ausencias", column: "created_by" },
      { table: "blog_articles", column: "author_id" },
    ];
    for (const { table, column } of detachTables) {
      const { error } = await supabase.from(table).update({ [column]: null }).eq(column, user.id);
      if (error) throw new Error(`Failed to detach ${table}.${column}: ${error.message}`);
    }
    logStep("Detached audit references");

    // Remove rows that belong solely to this user
    const ownedTables = ["push_subscriptions", "exercise_favorites", "user_credits", "user_subscriptions"];
    for (const table of ownedTables) {
      const { error } = await supabase.from(table).delete().eq("user_id", user.id);
      if (error) logStep(`Non-fatal cleanup error on ${table}`, { message: error.message });
    }
    logStep("Cleaned up owned rows");

    // Finally, delete the auth user (cascades profiles, user_roles, club_members, notifications)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw new Error(`Failed to delete user: ${deleteError.message}`);
    logStep("User deleted", { userId: user.id });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
