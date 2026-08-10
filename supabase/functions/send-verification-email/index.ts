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

// Simple in-memory rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(email: string, maxRequests = 3, windowMs = 300000): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = rateLimitStore.get(key);

  // Clean old entries
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) rateLimitStore.delete(k);
    }
  }

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= maxRequests;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

interface SendVerificationRequest {
  email: string;
  name: string;
  language: string;
}

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Email content by language
function getEmailContent(name: string, code: string, language: string) {
  const safeName = name.slice(0, 100).replace(/[<>]/g, ''); // Sanitize
  
  const translations: Record<string, { subject: string; greeting: string; intro: string; codeLabel: string; expiry: string; footer: string }> = {
    es: {
      subject: "Confirma tu cuenta - Top Volley Manager",
      greeting: `¡Hola ${safeName}!`,
      intro: "Gracias por registrarte en Top Volley Manager. Para completar tu registro, introduce el siguiente código de verificación:",
      codeLabel: "Tu código de verificación:",
      expiry: "Este código expira en 1 hora.",
      footer: "Si no solicitaste esta cuenta, puedes ignorar este email."
    },
    en: {
      subject: "Confirm your account - Top Volley Manager",
      greeting: `Hello ${safeName}!`,
      intro: "Thank you for signing up for Top Volley Manager. To complete your registration, enter the following verification code:",
      codeLabel: "Your verification code:",
      expiry: "This code expires in 1 hour.",
      footer: "If you didn't request this account, you can ignore this email."
    },
    it: {
      subject: "Conferma il tuo account - Top Volley Manager",
      greeting: `Ciao ${safeName}!`,
      intro: "Grazie per esserti registrato su Top Volley Manager. Per completare la registrazione, inserisci il seguente codice di verifica:",
      codeLabel: "Il tuo codice di verifica:",
      expiry: "Questo codice scade tra 1 ora.",
      footer: "Se non hai richiesto questo account, puoi ignorare questa email."
    }
  };

  const t = translations[language] || translations.es;

  return {
    subject: t.subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://www.topvolleymanager.com/__l5e/assets-v1/0cf6ac33-4ab5-4ee2-a321-c637e79542bf/tvm-logo.png" alt="Top Volley Manager" width="200" style="display:block;margin:0 auto 16px;height:auto;" />
          </div>
          
          <h2 style="color: #111827; font-size: 20px; margin-bottom: 16px;">${t.greeting}</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            ${t.intro}
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 12px;">${t.codeLabel}</p>
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; display: inline-block;">
              <span style="font-family: monospace; font-size: 36px; font-weight: bold; color: #3b82f6; letter-spacing: 8px;">${code}</span>
            </div>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-bottom: 24px;">
            ${t.expiry}
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            ${t.footer}
          </p>
        </div>
      </div>
    `
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, language }: SendVerificationRequest = await req.json();

    // Input validation
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!name || name.length < 1 || name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting: max 3 emails per 5 minutes per email address
    if (!checkRateLimit(email)) {
      console.warn(`[SECURITY] Rate limit exceeded for ${email}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait before trying again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders, "Retry-After": "300" } }
      );
    }

    console.log(`Sending verification email to ${email} in language ${language}`);

    // Generate verification code
    const code = generateVerificationCode();

    // Store token in database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Delete any existing tokens for this email
    await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('email', email);

    // Insert new token
    const { error: insertError } = await supabase
      .from('email_verification_tokens')
      .insert({
        email,
        token: code,
        language,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      });

    if (insertError) {
      console.error("Error inserting token:", insertError);
      throw insertError;
    }

    // Get email content
    const { subject, html } = getEmailContent(name, code, language);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Top Volley Manager <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    console.log("Verification email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
