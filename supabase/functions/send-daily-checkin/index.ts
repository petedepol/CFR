import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { sendWhatsApp } from "../_shared/twilio.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  // Auth check
  const apiKey = Deno.env.get("CHECKIN_API_KEY");
  const authHeader = req.headers.get("authorization") || "";
  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedRiders: string[] | undefined = body.riders;

    const supabase = getServiceClient();

    // Get riders with WhatsApp numbers
    let query = supabase
      .from("allowed_users")
      .select("name, email, whatsapp_number")
      .eq("role", "rider")
      .eq("active", true)
      .not("whatsapp_number", "is", null);

    if (requestedRiders && requestedRiders.length > 0) {
      query = query.in("name", requestedRiders);
    }

    const { data: riders, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch riders: ${error.message}`);
    }

    if (!riders || riders.length === 0) {
      return new Response(
        JSON.stringify({ error: "No riders found with WhatsApp numbers" }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const sent: string[] = [];
    const failed: string[] = [];

    for (const rider of riders) {
      try {
        // Create pending checkin row
        const { data: checkin, error: insertError } = await supabase
          .from("rider_checkins")
          .insert({
            rider_name: rider.name,
            rider_email: rider.email,
            status: "pending",
          })
          .select("id")
          .single();

        if (insertError) {
          throw insertError;
        }

        // Send WhatsApp message
        const message = `Hey ${rider.name}! Anything to report about the bike today? Voice or text — or just say "nothing".`;
        const messageSid = await sendWhatsApp(rider.whatsapp_number, message);

        // Store message SID
        await supabase
          .from("rider_checkins")
          .update({ twilio_message_sid: messageSid })
          .eq("id", checkin.id);

        sent.push(rider.name);
      } catch (err) {
        console.error(`Failed to send to ${rider.name}:`, err);
        failed.push(rider.name);
      }
    }

    // Notify Pete on WhatsApp
    const peteNumber = Deno.env.get("PETE_WHATSAPP_NUMBER");
    if (peteNumber && sent.length > 0) {
      const confirmation = `📤 Check-in sent to: ${sent.join(", ")}` +
        (failed.length > 0 ? `\n❌ Failed: ${failed.join(", ")}` : "");
      await sendWhatsApp(peteNumber, confirmation).catch((e) =>
        console.error("Failed to notify Pete:", e)
      );
    }

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-daily-checkin error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
