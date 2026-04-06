import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests = 10, windowMs = 900000): boolean {
  const now = Date.now();
  const key = identifier.toLowerCase();
  const entry = rateLimitStore.get(key);

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

interface VerifyCodeRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyCodeRequest = await req.json();

    // Input validation
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!code || typeof code !== "string" || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: "Invalid code format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting: max 10 attempts per email per 15 minutes
    if (!checkRateLimit(email)) {
      console.warn(`[SECURITY] Rate limit exceeded for verify-email-code: ${email}`);
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please wait before trying again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders, "Retry-After": "900" } }
      );
    }

    console.log(`Verifying code for ${email}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find valid token
    const { data: token, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('email', email)
      .eq('token', code)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !token) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark token as verified
    await supabase
      .from('email_verification_tokens')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', token.id);

    // Confirm user email in auth.users using admin API
    const { data: users, error: userListError } = await supabase.auth.admin.listUsers();
    
    if (userListError) {
      console.error("Error listing users:", userListError);
      throw userListError;
    }

    const user = users.users.find(u => u.email === email);
    
    if (user) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );

      if (updateError) {
        console.error("Error confirming user:", updateError);
        throw updateError;
      }

      console.log(`User ${email} email confirmed successfully`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in verify-email-code:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
