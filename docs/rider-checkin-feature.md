# Rider Daily Check-in Feature — Summary

## Status: PAUSED

## Goal
Automate daily rider feedback collection so Pete doesn't have to manually nag riders and manually process their responses after rides.

## Core Problems to Solve
1. Riders forget to give feedback
2. Feedback arrives all at once after rides, hard to process
3. Feedback needs to be detailed (nothing missed) but cleaned up
4. Must be easy for riders — WhatsApp is what they use daily
5. Riders only open the PWA at home to check settings, not daily

## What Was Built
- `rider_checkins` table in Supabase (migration applied)
- `whatsapp_number` column added to `allowed_users`
- `checkin-audio` storage bucket for voice notes
- 3 edge functions deployed:
  - `send-daily-checkin` — sends WhatsApp check-in prompts to riders
  - `process-checkin-reply` — receives Twilio webhook, processes text/voice, stores structured feedback
  - `checkin-status` — check who has/hasn't replied
- AI processing via Anthropic (Claude Haiku) for voice transcription and feedback structuring
- Twilio integration for WhatsApp messaging

## Twilio Setup (Active)
- Credentials stored as Supabase edge function secrets
- Sandbox number: +14155238886 (join code: bare-vessels)
- Webhook configured: process-checkin-reply
- Secrets set in Supabase: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, PETE_WHATSAPP_NUMBER, CHECKIN_API_KEY

## Bugs Fixed During Development
- Double `whatsapp:` prefix in Twilio helper (twilio.ts)
- Claude returning JSON wrapped in markdown code fences (ai.ts)
- Rider lookup mismatch on WhatsApp number format (process-checkin-reply)

## Why It Was Paused
The fundamental blocker: **no way to send WhatsApp messages to riders programmatically without WhatsApp Business API approval**.

Options explored and rejected:
- **Twilio WhatsApp Sandbox**: 72h disconnect — riders would need to re-join constantly
- **WhatsApp Business API**: Requires Meta Business verification (1-2 weeks), ongoing cost, overkill for 5 riders
- **SMS reminders**: Riders use WhatsApp, not SMS
- **In-app check-in**: Riders don't open the app daily (only at home for settings)
- **Pete forwarding messages**: Adds work instead of removing it — still reading everything manually
- **Telegram bot**: Riders don't use Telegram

**Bottom line**: The only channel riders use daily is WhatsApp, and you can't automate WhatsApp messaging cheaply/easily. Without automated reminders, the feature doesn't reduce Pete's workload enough to justify the complexity.

## To Resume
If any of these change, the feature can be revived:
1. WhatsApp Business API becomes simpler/cheaper
2. Riders start opening the app daily (then in-app check-in works)
3. A new messaging channel emerges that riders adopt
4. Meta/WhatsApp opens up bot messaging without Business API

All infrastructure (DB table, edge functions, Twilio account) remains in place and can be reactivated.
