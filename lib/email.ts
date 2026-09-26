import { Resend } from "resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]!,
  );
}

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export async function dispatchDrawNotification(drawId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: outbox } = await supabase
    .from("notification_outbox")
    .select("id, status, attempts")
    .eq("draw_id", drawId)
    .maybeSingle();

  if (!outbox || outbox.status === "sent") return;

  const { data: draw, error: drawError } = await supabase
    .from("draws")
    .select("id, winner_participant_id")
    .eq("id", drawId)
    .single();

  if (drawError || !draw) throw new Error("Draw notification data was not found.");

  const [{ data: participant }, { data: claim }] = await Promise.all([
    supabase
      .from("participants")
      .select("name, email, lucky_draw_id")
      .eq("id", draw.winner_participant_id)
      .single(),
    supabase
      .from("claims")
      .select("claim_deadline")
      .eq("draw_id", drawId)
      .single(),
  ]);

  if (!participant || !claim) throw new Error("Winner details were not found.");

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WINNER_FROM_EMAIL;
  if (!apiKey || !from) {
    await supabase
      .from("notification_outbox")
      .update({
        status: "failed",
        attempts: outbox.attempts + 1,
        last_error: "Resend environment variables are not configured.",
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", outbox.id);
    return;
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: participant.email,
    replyTo: process.env.WINNER_REPLY_TO,
    subject: "You won the festival lucky draw!",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#24172d">
        <p style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#8a5b22">Festival Lucky Draw</p>
        <h1 style="font-size:30px;margin:12px 0">Congratulations, ${escapeHtml(participant.name)}!</h1>
        <p>Your lucky-draw ID <strong>${escapeHtml(participant.lucky_draw_id)}</strong> has been selected.</p>
        <p>Please visit the festival help desk with your lucky-draw ID, submitted phone number, and a government-issued identity document.</p>
        <p><strong>Claim before:</strong> ${escapeHtml(formatDeadline(claim.claim_deadline))}</p>
        <p>No replacement winner will be selected if the prize is not claimed by the deadline.</p>
      </div>
    `,
  });

  await supabase
    .from("notification_outbox")
    .update({
      status: error ? "failed" : "sent",
      attempts: outbox.attempts + 1,
      last_error: error?.message ?? null,
      provider_message_id: data?.id ?? null,
      last_attempt_at: new Date().toISOString(),
      sent_at: error ? null : new Date().toISOString(),
    })
    .eq("id", outbox.id);
}
