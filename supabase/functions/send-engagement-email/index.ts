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

interface SendEngagementEmailRequest {
  registrationId: string;
  recipientEmail: string;
  recipientName: string;
  emailType: 'welcome' | 'engagement' | 'upgrade';
  language?: string;
}

const getEmailContent = (type: string, name: string, language: string = 'es') => {
  const templates = {
    welcome: {
      es: {
        subject: `¡Bienvenido a Top Volley Manager, ${name}!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">¡Hola ${name}! 👋</h1>
            <p style="font-size: 16px; color: #374151;">
              Gracias por registrarte en Top Volley Manager. Estamos encantados de tenerte con nosotros.
            </p>
            <p style="font-size: 16px; color: #374151;">
              ¿Necesitas ayuda para empezar? Aquí tienes algunos pasos rápidos:
            </p>
            <ul style="font-size: 16px; color: #374151;">
              <li>Crea tus equipos y añade jugadoras</li>
              <li>Programa entrenamientos y partidos</li>
              <li>Gestiona asistencias y valoraciones</li>
            </ul>
            <p style="font-size: 16px; color: #374151;">
              Si tienes cualquier pregunta, no dudes en contactarnos.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Un saludo,<br>
              El equipo de Top Volley Manager
            </p>
          </div>
        `
      },
      en: {
        subject: `Welcome to Top Volley Manager, ${name}!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Hi ${name}! 👋</h1>
            <p style="font-size: 16px; color: #374151;">
              Thank you for signing up for Top Volley Manager. We're thrilled to have you with us.
            </p>
            <p style="font-size: 16px; color: #374151;">
              Need help getting started? Here are some quick steps:
            </p>
            <ul style="font-size: 16px; color: #374151;">
              <li>Create your teams and add players</li>
              <li>Schedule trainings and matches</li>
              <li>Manage attendance and ratings</li>
            </ul>
            <p style="font-size: 16px; color: #374151;">
              If you have any questions, feel free to contact us.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Best regards,<br>
              The Top Volley Manager Team
            </p>
          </div>
        `
      }
    },
    engagement: {
      es: {
        subject: `${name}, ¿cómo va todo en Top Volley Manager?`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">¡Hola ${name}! 🏐</h1>
            <p style="font-size: 16px; color: #374151;">
              Hace tiempo que no te vemos por Top Volley Manager y queríamos saber cómo te va.
            </p>
            <p style="font-size: 16px; color: #374151;">
              ¿Sabías que puedes:
            </p>
            <ul style="font-size: 16px; color: #374151;">
              <li>Ver estadísticas de evolución de tus jugadoras</li>
              <li>Gestionar desplazamientos a partidos fuera</li>
              <li>Comunicarte con tu equipo técnico</li>
            </ul>
            <p style="font-size: 16px; color: #374151;">
              ¡Te esperamos de vuelta! Si necesitas ayuda, estamos aquí.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Un saludo,<br>
              El equipo de Top Volley Manager
            </p>
          </div>
        `
      },
      en: {
        subject: `${name}, how's everything going with Top Volley Manager?`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Hi ${name}! 🏐</h1>
            <p style="font-size: 16px; color: #374151;">
              It's been a while since we've seen you on Top Volley Manager and we wanted to check in.
            </p>
            <p style="font-size: 16px; color: #374151;">
              Did you know you can:
            </p>
            <ul style="font-size: 16px; color: #374151;">
              <li>View player evolution statistics</li>
              <li>Manage travel to away games</li>
              <li>Communicate with your coaching staff</li>
            </ul>
            <p style="font-size: 16px; color: #374151;">
              We're waiting for you! If you need help, we're here.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Best regards,<br>
              The Top Volley Manager Team
            </p>
          </div>
        `
      }
    },
    upgrade: {
      es: {
        subject: `${name}, ¡desbloquea todo el potencial de Top Volley Manager!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">¡Hola ${name}! ⭐</h1>
            <p style="font-size: 16px; color: #374151;">
              Hemos visto que estás sacando partido a Top Volley Manager. ¡Genial!
            </p>
            <p style="font-size: 16px; color: #374151;">
              ¿Sabías que con un plan Premium puedes:
            </p>
            <ul style="font-size: 16px; color: #374151;">
              <li>✨ Acceso ilimitado a todas las funciones</li>
              <li>📊 Estadísticas avanzadas y comparativas</li>
              <li>👥 Gestión de múltiples equipos sin límites</li>
              <li>🔔 Notificaciones push y recordatorios</li>
            </ul>
            <p style="font-size: 16px; color: #374151;">
              Actualiza hoy y lleva la gestión de tu club al siguiente nivel.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Un saludo,<br>
              El equipo de Top Volley Manager
            </p>
          </div>
        `
      },
      en: {
        subject: `${name}, unlock the full potential of Top Volley Manager!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Hi ${name}! ⭐</h1>
            <p style="font-size: 16px; color: #374151;">
              We've noticed you're getting the most out of Top Volley Manager. Great!
            </p>
            <p style="font-size: 16px; color: #374151;">
              Did you know with a Premium plan you can:
            </p>
            <ul style="font-size: 16px; color: #374151;">
              <li>✨ Unlimited access to all features</li>
              <li>📊 Advanced statistics and comparisons</li>
              <li>👥 Manage multiple teams without limits</li>
              <li>🔔 Push notifications and reminders</li>
            </ul>
            <p style="font-size: 16px; color: #374151;">
              Upgrade today and take your club management to the next level.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Best regards,<br>
              The Top Volley Manager Team
            </p>
          </div>
        `
      }
    }
  };

  const lang = language === 'en' ? 'en' : 'es';
  return templates[type as keyof typeof templates]?.[lang] || templates.welcome.es;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify caller is an app admin
    const { data: isAdmin } = await supabase.rpc('is_app_admin', { _email: user.email });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Only app admins can send emails" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { registrationId, recipientEmail, recipientName, emailType, language = 'es' }: SendEngagementEmailRequest = await req.json();

    const emailContent = getEmailContent(emailType, recipientName, language);

    const emailResponse = await resend.emails.send({
      from: "Top Volley Manager <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Engagement email sent:", emailResponse);

    // Update the registration record with email sent timestamp
    if (registrationId) {
      await supabase
        .from('user_registrations')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', registrationId);
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-engagement-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
