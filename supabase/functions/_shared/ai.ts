const NOTHING_KEYWORDS = [
  "nothing",
  "no",
  "nope",
  "all good",
  "everything fine",
  "no issues",
  "nothing to report",
  "all fine",
  "good",
  "nah",
  "n/a",
  "na",
];

export function isNothingToReport(text: string): boolean {
  const normalized = text.toLowerCase().trim().replace(/[.!?,]/g, "");
  return NOTHING_KEYWORDS.some(
    (kw) => normalized === kw || normalized === `${kw} thanks` || normalized === `${kw} thank you`
  );
}

interface StructuredFeedback {
  summary: string;
  category: string;
  severity: string;
  action_items: string[];
}

const STRUCTURING_PROMPT = `You are analyzing rider feedback about their racing bicycle. Structure this into JSON with these fields:
- summary: 1-2 sentence summary of the issue
- category: one of [bike_feel, comfort, parts, suspension, drivetrain, brakes, wheels_tires, fit, other]
- severity: one of [info, minor, significant, urgent]
- action_items: array of specific things the mechanic should check or do

Respond with ONLY valid JSON, no other text.`;

export async function transcribeAndStructureAudio(
  audioData: Uint8Array,
  contentType: string,
  riderName: string
): Promise<{ transcription: string; feedback: StructuredFeedback | null }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

  // Map content types to Anthropic-supported media types
  const mediaTypeMap: Record<string, string> = {
    "audio/ogg": "audio/ogg",
    "audio/ogg; codecs=opus": "audio/ogg",
    "audio/mpeg": "audio/mpeg",
    "audio/mp4": "audio/mp4",
    "audio/wav": "audio/wav",
    "audio/webm": "audio/webm",
  };
  const mediaType = mediaTypeMap[contentType] || "audio/ogg";
  const base64Audio = btoa(String.fromCharCode(...audioData));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "audio",
            source: { type: "base64", media_type: mediaType, data: base64Audio },
          },
          {
            type: "text",
            text: `This is a voice note from rider ${riderName} about their racing bicycle. Do two things:
1. First, transcribe the audio exactly as spoken.
2. Then, structure the feedback as JSON.

Respond in this exact format:
TRANSCRIPTION: <exact transcription here>
---
<JSON feedback>

${STRUCTURING_PROMPT}

If the rider says nothing of substance (e.g. "nothing", "all good"), respond:
TRANSCRIPTION: <what they said>
---
NOTHING`,
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.content[0].text;

  // Parse the response
  const parts = content.split("---");
  const transcription = (parts[0] || "").replace("TRANSCRIPTION:", "").trim();
  const jsonPart = (parts[1] || "").trim();

  if (jsonPart === "NOTHING" || isNothingToReport(transcription)) {
    return { transcription, feedback: null };
  }

  const cleanJson = jsonPart.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const feedback = JSON.parse(cleanJson);
  return { transcription, feedback };
}

export async function structureFeedback(
  riderName: string,
  feedbackText: string
): Promise<StructuredFeedback> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `${STRUCTURING_PROMPT}\n\nRider: ${riderName}\nFeedback: ${feedbackText}`,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.content[0].text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(text);
}
