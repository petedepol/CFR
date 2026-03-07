import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
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
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    const supabase = getServiceClient();

    const { data: checkins, error } = await supabase
      .from("rider_checkins")
      .select("id, rider_name, status, raw_message, structured_feedback, actioned, action_notes, created_at, replied_at")
      .eq("checkin_date", date)
      .order("rider_name");

    if (error) {
      throw new Error(`Failed to fetch checkins: ${error.message}`);
    }

    // Group by status for quick overview
    const summary = {
      date,
      total: checkins?.length || 0,
      pending: checkins?.filter((c) => c.status === "pending").length || 0,
      replied: checkins?.filter((c) => c.status === "replied").length || 0,
      nothing_to_report: checkins?.filter((c) => c.status === "nothing_to_report").length || 0,
      checkins: checkins || [],
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("checkin-status error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
