import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PUSH] ${step}${detailsStr}`);
};

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// --- Android (FCM) ---

async function getFcmAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get FCM access token: ${await tokenResponse.text()}`);
  }
  const { access_token } = await tokenResponse.json();
  return access_token;
}

async function sendViaFcm(
  serviceAccount: { project_id: string; client_email: string; private_key: string },
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const accessToken = await getFcmAccessToken(serviceAccount);
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title, body },
          data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
        },
      }),
    },
  );
  if (res.ok) return { ok: true };
  return { ok: false, error: await res.text() };
}

// --- iOS (direct APNs) ---

let cachedApnsJwt: { token: string; expiresAt: number } | null = null;

async function getApnsJwt(keyId: string, teamId: string, privateKeyPem: string): Promise<string> {
  if (cachedApnsJwt && cachedApnsJwt.expiresAt > Date.now() + 60_000) {
    return cachedApnsJwt.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: keyId };
  const claims = { iss: teamId, iat: now };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64url(signature)}`;
  cachedApnsJwt = { token: jwt, expiresAt: Date.now() + 55 * 60_000 };
  return jwt;
}

async function sendViaApns(
  config: { keyId: string; teamId: string; privateKey: string; topic: string; useSandbox: boolean },
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const jwt = await getApnsJwt(config.keyId, config.teamId, config.privateKey);
  const host = config.useSandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";

  const res = await fetch(`https://${host}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": config.topic,
      "apns-push-type": "alert",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      aps: { alert: { title, body }, sound: "default" },
      ...(data ?? {}),
    }),
  });
  if (res.ok) return { ok: true };
  return { ok: false, error: await res.text() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const { user_id, title, body, data } = await req.json();
    if (!user_id || !title || !body) {
      throw new Error("user_id, title and body are required");
    }

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);
    if (tokensError) throw tokensError;

    if (!tokens || tokens.length === 0) {
      logStep("No push tokens for user", { user_id });
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const androidTokens = tokens.filter(t => t.platform === "android");
    const iosTokens = tokens.filter(t => t.platform === "ios");

    let sent = 0;
    const failures: string[] = [];
    const unregisteredTokens: string[] = [];

    if (androidTokens.length > 0) {
      const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
      if (!serviceAccountJson) {
        failures.push("FIREBASE_SERVICE_ACCOUNT secret is not configured");
      } else {
        const serviceAccount = JSON.parse(serviceAccountJson);
        for (const { token: deviceToken } of androidTokens) {
          const result = await sendViaFcm(serviceAccount, deviceToken, title, body, data);
          if (result.ok) {
            sent++;
          } else {
            failures.push(result.error!);
            if (result.error!.includes("UNREGISTERED") || result.error!.includes("INVALID_ARGUMENT")) {
              unregisteredTokens.push(deviceToken);
            }
          }
        }
      }
    }

    if (iosTokens.length > 0) {
      const keyId = Deno.env.get("APNS_KEY_ID");
      const teamId = Deno.env.get("APNS_TEAM_ID");
      const privateKey = Deno.env.get("APNS_PRIVATE_KEY");
      const apnsTopic = Deno.env.get("APNS_TOPIC") ?? "app.lovable.topvolleymanager";
      const useSandbox = Deno.env.get("APNS_USE_SANDBOX") !== "false";

      if (!keyId || !teamId || !privateKey) {
        failures.push("APNS_KEY_ID, APNS_TEAM_ID and APNS_PRIVATE_KEY secrets are not configured");
      } else {
        for (const { token: deviceToken } of iosTokens) {
          const result = await sendViaApns(
            { keyId, teamId, privateKey, topic: apnsTopic, useSandbox },
            deviceToken,
            title,
            body,
            data,
          );
          if (result.ok) {
            sent++;
          } else {
            failures.push(result.error!);
            if (result.error!.includes("BadDeviceToken") || result.error!.includes("Unregistered")) {
              unregisteredTokens.push(deviceToken);
            }
          }
        }
      }
    }

    if (unregisteredTokens.length > 0) {
      await supabase.from("push_tokens").delete().in("token", unregisteredTokens);
    }

    logStep("Push notifications sent", { sent, failed: failures.length });
    return new Response(JSON.stringify({ sent, failed: failures.length, errors: failures }), {
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
