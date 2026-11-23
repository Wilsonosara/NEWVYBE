// @ts-nocheck -- Supabase Edge Functions run under Deno, outside the Next.js TypeScript project.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@vybe.social";
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return Response.json({ error: "Call push notifications are not configured." }, { status: 503, headers: corsHeaders });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) return Response.json({ error: "Sign in before notifying another user." }, { status: 401, headers: corsHeaders });

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return Response.json({ error: "Invalid session." }, { status: 401, headers: corsHeaders });

  let callId = "";
  try {
    const body = await request.json() as { callId?: string };
    callId = body.callId || "";
  } catch {
    return Response.json({ error: "A call ID is required." }, { status: 400, headers: corsHeaders });
  }
  if (!callId) return Response.json({ error: "A call ID is required." }, { status: 400, headers: corsHeaders });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: call, error: callError } = await admin
    .from("direct_call_sessions")
    .select("call_id, caller_id, recipient_id, caller_name, status")
    .eq("call_id", callId)
    .eq("caller_id", user.id)
    .eq("status", "ringing")
    .maybeSingle();
  if (callError || !call) return Response.json({ error: "Call not found or no longer ringing." }, { status: 404, headers: corsHeaders });

  const { data: subscriptions, error: subscriptionError } = await admin
    .from("push_subscriptions")
    .select("endpoint, subscription")
    .eq("user_id", call.recipient_id);
  if (subscriptionError) return Response.json({ error: "Could not load push subscriptions." }, { status: 500, headers: corsHeaders });
  if (!subscriptions?.length) return Response.json({ delivered: 0 }, { headers: corsHeaders });

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const payload = JSON.stringify({
    type: "incoming-call",
    callId: call.call_id,
    callerId: call.caller_id,
    callerName: call.caller_name,
    title: `${call.caller_name} is calling`,
    body: "Tap to open VYBE and answer.",
    url: `/app/messages?call=${encodeURIComponent(call.call_id)}&user=${encodeURIComponent(call.caller_id)}`,
  });

  const results = await Promise.allSettled(subscriptions.map(async ({ endpoint, subscription }) => {
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 60, urgency: "high" });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
      throw error;
    }
  }));
  const delivered = results.filter((result) => result.status === "fulfilled").length;
  return Response.json({ delivered, failed: results.length - delivered }, { headers: corsHeaders });
});
