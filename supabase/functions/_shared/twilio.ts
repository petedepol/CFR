const getAccountSid = () => Deno.env.get("TWILIO_ACCOUNT_SID")!;
const getAuthToken = () => Deno.env.get("TWILIO_AUTH_TOKEN")!;
const getWhatsAppNumber = () => Deno.env.get("TWILIO_WHATSAPP_NUMBER")!;

export async function sendWhatsApp(to: string, body: string): Promise<string> {
  const accountSid = getAccountSid();
  const authToken = getAuthToken();
  const from = getWhatsAppNumber();

  const toNum = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const fromNum = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

  const params = new URLSearchParams({
    To: toNum,
    From: fromNum,
    Body: body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + btoa(`${accountSid}:${authToken}`),
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio send failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.sid;
}

export async function downloadTwilioMedia(mediaUrl: string): Promise<Uint8Array> {
  const accountSid = getAccountSid();
  const authToken = getAuthToken();

  const res = await fetch(mediaUrl, {
    headers: {
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download media: ${res.status}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}

export function parseTwilioWebhook(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}
