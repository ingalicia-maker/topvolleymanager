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
    const { email, name, language = "es" } = await req.json();

    if (!email || typeof email !== "string") {
      throw new Error("Email is required");
    }


    const userName = name || "";

    const translations: Record<string, any> = {
      es: {
        subject: "🏐 ¡Bienvenido a Top Volley Manager!",
        greeting: userName ? `¡Hola ${userName}!` : "¡Hola!",
        welcomeTitle: "Bienvenido a Top Volley Manager",
        welcomeText: "Tu plataforma integral para la gestión de clubes y equipos de voleibol. Estamos encantados de tenerte con nosotros.",
        ctaTitle: "¿Aún no has creado tu cuenta?",
        ctaText: "Regístrate gratis y empieza a disfrutar de todas las herramientas:",
        ctaButton: "Crear mi cuenta gratis",
        features: [
          { icon: "📋", title: "Gestión de equipos", desc: "Organiza todos tus equipos, jugadoras y plantillas en un solo lugar." },
          { icon: "📅", title: "Calendario de eventos", desc: "Entrenos, partidos, desplazamientos... todo sincronizado y con convocatorias automáticas." },
          { icon: "📊", title: "Evaluaciones y seguimiento", desc: "Valora el rendimiento de cada jugadora con nuestro sistema de ratings multidimensional." },
          { icon: "🚌", title: "Gestión de desplazamientos", desc: "Coordina autobuses, paradas y confirmaciones de asistencia de forma sencilla." },
          { icon: "💪", title: "Biblioteca de ejercicios", desc: "Accede a una completa colección de ejercicios de voleibol con vídeos y diagramas." },
          { icon: "💬", title: "Mensajería interna", desc: "Comunícate con tu equipo técnico de forma directa y organizada." },
        ],
        freeTrialTitle: "🎉 Prueba gratis",
        freeTrialText: "Empieza con nuestro plan gratuito que incluye gestión de equipos, calendario, ejercicios y mucho más. Sin compromiso, sin tarjeta de crédito.",
        premiumText: "¿Necesitas más? Nuestro plan Premium por solo 5€/mes desbloquea equipos ilimitados, créditos ilimitados de IA y todas las funciones avanzadas.",
        footer: "¡Nos vemos en la cancha! 🏐",
        team: "El equipo de Top Volley Manager",
      },
      en: {
        subject: "🏐 Welcome to Top Volley Manager!",
        greeting: userName ? `Hello ${userName}!` : "Hello!",
        welcomeTitle: "Welcome to Top Volley Manager",
        welcomeText: "Your all-in-one platform for volleyball club and team management. We're thrilled to have you on board.",
        ctaTitle: "Haven't created your account yet?",
        ctaText: "Sign up for free and start using all our tools:",
        ctaButton: "Create my free account",
        features: [
          { icon: "📋", title: "Team Management", desc: "Organize all your teams, players and rosters in one place." },
          { icon: "📅", title: "Event Calendar", desc: "Trainings, matches, trips... all synced with automatic call-ups." },
          { icon: "📊", title: "Evaluations & Tracking", desc: "Rate each player's performance with our multi-dimensional rating system." },
          { icon: "🚌", title: "Travel Management", desc: "Coordinate buses, stops and attendance confirmations easily." },
          { icon: "💪", title: "Exercise Library", desc: "Access a complete collection of volleyball exercises with videos and diagrams." },
          { icon: "💬", title: "Internal Messaging", desc: "Communicate with your coaching staff directly and organized." },
        ],
        freeTrialTitle: "🎉 Free Trial",
        freeTrialText: "Start with our free plan that includes team management, calendar, exercises and much more. No commitment, no credit card required.",
        premiumText: "Need more? Our Premium plan for just €5/month unlocks unlimited teams, unlimited AI credits and all advanced features.",
        footer: "See you on the court! 🏐",
        team: "The Top Volley Manager Team",
      },
      it: {
        subject: "🏐 Benvenuto su Top Volley Manager!",
        greeting: userName ? `Ciao ${userName}!` : "Ciao!",
        welcomeTitle: "Benvenuto su Top Volley Manager",
        welcomeText: "La tua piattaforma completa per la gestione di club e squadre di pallavolo. Siamo felici di averti con noi.",
        ctaTitle: "Non hai ancora creato il tuo account?",
        ctaText: "Registrati gratis e inizia a utilizzare tutti i nostri strumenti:",
        ctaButton: "Crea il mio account gratuito",
        features: [
          { icon: "📋", title: "Gestione squadre", desc: "Organizza tutte le tue squadre, giocatrici e rose in un unico posto." },
          { icon: "📅", title: "Calendario eventi", desc: "Allenamenti, partite, trasferte... tutto sincronizzato con convocazioni automatiche." },
          { icon: "📊", title: "Valutazioni e monitoraggio", desc: "Valuta le prestazioni di ogni giocatrice con il nostro sistema di rating multidimensionale." },
          { icon: "🚌", title: "Gestione trasferte", desc: "Coordina autobus, fermate e conferme di presenza in modo semplice." },
          { icon: "💪", title: "Libreria esercizi", desc: "Accedi a una raccolta completa di esercizi di pallavolo con video e diagrammi." },
          { icon: "💬", title: "Messaggistica interna", desc: "Comunica con il tuo staff tecnico in modo diretto e organizzato." },
        ],
        freeTrialTitle: "🎉 Prova gratuita",
        freeTrialText: "Inizia con il nostro piano gratuito che include gestione squadre, calendario, esercizi e molto altro. Senza impegno, senza carta di credito.",
        premiumText: "Hai bisogno di più? Il nostro piano Premium a soli 5€/mese sblocca squadre illimitate, crediti IA illimitati e tutte le funzionalità avanzate.",
        footer: "Ci vediamo in campo! 🏐",
        team: "Il team di Top Volley Manager",
      },
    };

    const lang = language.startsWith("en") ? "en" : language.startsWith("it") ? "it" : "es";
    const t = translations[lang] || translations.es;

    const featuresHtml = t.features
      .map(
        (f: any) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="40" style="vertical-align:top;font-size:24px;">${f.icon}</td>
                <td style="vertical-align:top;">
                  <strong style="color:#1e293b;font-size:15px;">${f.title}</strong>
                  <br/>
                  <span style="color:#64748b;font-size:13px;line-height:1.4;">${f.desc}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;">
    <tr><td align="center" style="padding:20px 10px;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 24px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:28px;">🏐 Top Volley Manager</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">${t.welcomeText}</p>
          </td>
        </tr>
        <!-- Greeting -->
        <tr>
          <td style="padding:28px 24px 12px;">
            <h2 style="color:#1e293b;margin:0;font-size:22px;">${t.greeting}</h2>
            <p style="color:#475569;font-size:15px;line-height:1.6;margin:12px 0 0;">${t.welcomeText}</p>
          </td>
        </tr>
        <!-- Features -->
        <tr>
          <td style="padding:8px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
              ${featuresHtml}
            </table>
          </td>
        </tr>
        <!-- Free Trial -->
        <tr>
          <td style="padding:24px;">
            <div style="background:#eff6ff;border-radius:8px;padding:20px;text-align:center;">
              <h3 style="color:#1e40af;margin:0 0 8px;font-size:18px;">${t.freeTrialTitle}</h3>
              <p style="color:#3b82f6;font-size:14px;margin:0 0 16px;line-height:1.5;">${t.freeTrialText}</p>
              <a href="https://www.topvolleymanager.com/auth" style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">${t.ctaButton}</a>
              <p style="color:#64748b;font-size:13px;margin:16px 0 0;">${t.premiumText}</p>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 24px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#1e293b;font-size:15px;margin:0 0 4px;font-weight:bold;">${t.footer}</p>
            <p style="color:#94a3b8;font-size:13px;margin:0;">${t.team}</p>
            <p style="color:#cbd5e1;font-size:11px;margin:12px 0 0;">© ${new Date().getFullYear()} Top Volley Manager SL, Plaza Pontevedra 10, 2B, 15003 A Coruña</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const messageId = `welcome-${crypto.randomUUID()}`;

    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "welcome",
      recipient_email: email,
      status: "pending",
    });

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        idempotency_key: `welcome-${email.toLowerCase()}`,
        to: email,
        from: "Top Volley Manager <noreply@topvolleymanager.com>",
        sender_domain: "notify.topvolleymanager.com",
        subject: t.subject,
        html,
        purpose: "transactional",
        label: "welcome",
        queued_at: new Date().toISOString(),
      },

    });

    if (enqueueError) {
      console.error("Failed to enqueue welcome email:", enqueueError);
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "welcome",
        recipient_email: email,
        status: "failed",
        error_message: enqueueError.message,
      });
    } else {
      console.log("Welcome email enqueued for", email);
    }


    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
