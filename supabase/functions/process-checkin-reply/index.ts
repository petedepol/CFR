import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  parseTwilioWebhook,
  downloadTwilioMedia,
  sendWhatsApp,
} from "../_shared/twilio.ts";
import {
  isNothingToReport,
  transcribeAndStructureAudio,
  structureFeedback,
} from "../_shared/ai.ts";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    const webhook = parseTwilioWebhook(body);

    const fromNumber = webhook.From?.replace("whatsapp:", "") || "";
    const messageBody = webhook.Body || "";
    const numMedia = parseInt(webhook.NumMedia || "0", 10);
    const mediaUrl = webhook.MediaUrl0 || "";
    const mediaContentType = webhook.MediaContentType0 || "";

    const supabase = getServiceClient();
    const peteNumber = Deno.env.get("PETE_WHATSAPP_NUMBER")!;

    // Look up rider by WhatsApp number
    const { data: rider, error: riderError } = await supabase
      .from("allowed_users")
      .select("name, email, whatsapp_number")
      .eq("whatsapp_number", fromNumber)
      .eq("role", "rider")
      .single();

    if (riderError || !rider) {
      console.error("Unknown sender:", fromNumber);
      // Return 200 so Twilio doesn't retry
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Find pending checkin for this rider (today or most recent pending)
    const { data: checkin, error: checkinError } = await supabase
      .from("rider_checkins")
      .select("*")
      .eq("rider_name", rider.name)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (checkinError || !checkin) {
      // No pending checkin — could be an unsolicited message, ignore gracefully
      console.log("No pending checkin for", rider.name);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    let feedbackText = messageBody;
    let audioUrl: string | null = null;
    let status: string;
    let structuredData = null;

    // Handle voice note
    if (numMedia > 0 && mediaContentType.startsWith("audio/")) {
      const audioData = await downloadTwilioMedia(mediaUrl);

      // Upload to Supabase storage
      const fileName = `${rider.name.toLowerCase()}/${checkin.id}.ogg`;
      const { error: uploadError } = await supabase.storage
        .from("checkin-audio")
        .upload(fileName, audioData, {
          contentType: mediaContentType,
          upsert: true,
        });

      if (uploadError) {
        console.error("Audio upload failed:", uploadError);
      } else {
        const { data: urlData } = supabase.storage
          .from("checkin-audio")
          .getPublicUrl(fileName);
        audioUrl = urlData?.publicUrl || null;
      }

      // Transcribe + structure in one Claude call
      const result = await transcribeAndStructureAudio(audioData, mediaContentType, rider.name);
      feedbackText = result.transcription;
      if (result.feedback) {
        status = "replied";
        structuredData = result.feedback;
      } else {
        status = "nothing_to_report";
      }
    } else {
      // Text message — process normally
      if (isNothingToReport(feedbackText)) {
        status = "nothing_to_report";
      } else {
        status = "replied";
        structuredData = await structureFeedback(rider.name, feedbackText);
      }
    }

    // Update checkin record
    await supabase
      .from("rider_checkins")
      .update({
        status,
        raw_message: feedbackText,
        audio_url: audioUrl,
        structured_feedback: structuredData,
        replied_at: new Date().toISOString(),
      })
      .eq("id", checkin.id);

    // Send summary to Pete
    let peteSummary: string;
    if (status === "nothing_to_report") {
      peteSummary = `✅ ${rider.name}: Nothing to report`;
    } else {
      const fb = structuredData!;
      peteSummary =
        `🚴 ${rider.name} check-in:\n` +
        `📋 ${fb.summary}\n` +
        `🏷️ ${fb.category} | ${fb.severity}\n` +
        (fb.action_items.length > 0
          ? `\n🔧 Action items:\n${fb.action_items.map((a: string) => `• ${a}`).join("\n")}`
          : "");
    }

    await sendWhatsApp(peteNumber, peteSummary);

    // Return empty TwiML response
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (err) {
    console.error("process-checkin-reply error:", err);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
});
