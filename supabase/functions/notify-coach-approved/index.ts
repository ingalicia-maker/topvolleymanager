import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyCoachApprovedRequest {
  coachEmail: string;
  coachName: string;
  approvedBy: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coachEmail, coachName, approvedBy }: NotifyCoachApprovedRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Voleibol Manager <onboarding@resend.dev>",
      to: [coachEmail],
      subject: "¡Tu cuenta ha sido aprobada!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 16px; background: #22c55e; border-radius: 50%;">
              <span style="font-size: 32px;">✓</span>
            </div>
          </div>
          <h1 style="color: #22c55e; text-align: center; margin-bottom: 20px;">¡Cuenta Aprobada!</h1>
          <p style="font-size: 16px; color: #374151;">Hola ${coachName},</p>
          <p style="font-size: 16px; color: #374151;">
            ¡Buenas noticias! Tu cuenta de entrenador ha sido aprobada por <strong>${approvedBy}</strong>.
          </p>
          <p style="font-size: 16px; color: #374151;">
            Ya tienes acceso completo a la aplicación y puedes:
          </p>
          <ul style="font-size: 16px; color: #374151; padding-left: 20px;">
            <li>Gestionar tus equipos asignados</li>
            <li>Crear y gestionar convocatorias</li>
            <li>Registrar asistencias y valoraciones</li>
            <li>Ver estadísticas de tus jugadoras</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 14px; color: #6b7280;">
              Accede a la aplicación para empezar a gestionar tus equipos.
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            Este email fue enviado automáticamente por Voleibol Manager.
          </p>
        </div>
      `,
    });

    console.log("Coach approval email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-coach-approved:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
