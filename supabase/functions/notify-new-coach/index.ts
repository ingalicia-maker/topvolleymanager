import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyNewCoachRequest {
  coachName: string;
  coachEmail: string;
  userId?: string;
  clubName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coachName, coachEmail, userId, clubName }: NotifyNewCoachRequest = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Register the coach in user_registrations table
    const { error: regError } = await supabase
      .from('user_registrations')
      .insert({
        user_id: userId || null,
        email: coachEmail,
        name: coachName,
        profile_type: 'coach',
        club_name: clubName || null,
      });

    if (regError) {
      console.error("Error registering coach:", regError);
    } else {
      console.log("Coach registration recorded for:", coachEmail);
    }
    
    const { data: directorRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'director');

    if (rolesError) throw rolesError;

    if (!directorRoles || directorRoles.length === 0) {
      console.log("No directors found to notify");
      return new Response(JSON.stringify({ message: "No directors to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get director emails from profiles
    const directorIds = directorRoles.map(r => r.user_id);
    const { data: directorProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, name')
      .in('id', directorIds);

    if (profilesError) throw profilesError;

    // Send email to each director
    const emailPromises = directorProfiles?.map(director => 
      resend.emails.send({
        from: "Top Volley Manager <onboarding@resend.dev>",
        to: [director.email],
        subject: "Nuevo entrenador registrado",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6; margin-bottom: 20px;">Nuevo Entrenador Registrado</h1>
            <p style="font-size: 16px; color: #374151;">Hola ${director.name || 'Director'},</p>
            <p style="font-size: 16px; color: #374151;">Un nuevo entrenador se ha registrado en la aplicación:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${coachName}</p>
              <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">${coachEmail}</p>
              ${clubName ? `<p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">Club: ${clubName}</p>` : ''}
            </div>
            <p style="font-size: 16px; color: #374151;">
              Puedes revisar y aprobar este entrenador desde el panel de 
              <strong>Gestión de Entrenadores</strong> en tu perfil.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="font-size: 12px; color: #9ca3af;">
              Este email fue enviado automáticamente por Top Volley Manager.
            </p>
          </div>
        `,
      })
    ) || [];

    await Promise.all(emailPromises);

    console.log(`Notified ${directorProfiles?.length || 0} directors about new coach: ${coachName}`);

    return new Response(JSON.stringify({ success: true, notified: directorProfiles?.length || 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-new-coach:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
