import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyNewDirectorRequest {
  directorName: string;
  directorEmail: string;
  clubName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { directorName, directorEmail, clubName }: NotifyNewDirectorRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Top Volley Manager <onboarding@resend.dev>",
      to: ["pino@mailper.com"],
      subject: `Nuevo Director Deportivo registrado: ${directorName}`,
      html: `
        <h1>Nuevo registro en Top Volley Manager</h1>
        <p>Un nuevo Director Deportivo ha creado una cuenta y un club:</p>
        <ul>
          <li><strong>Nombre:</strong> ${directorName}</li>
          <li><strong>Email:</strong> ${directorEmail}</li>
          <li><strong>Club:</strong> ${clubName}</li>
        </ul>
        <p>Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</p>
      `,
    });

    console.log("Admin notification email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-new-director function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
