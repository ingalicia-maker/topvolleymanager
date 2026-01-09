import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      console.log("Invalid or expired token:", tokenError);
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
