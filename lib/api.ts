import { NextResponse } from "next/server";

const publicMessages: Record<string, string> = {
  duplicate_email: "This email address is already registered.",
  duplicate_phone: "This phone number is already registered.",
  registration_closed: "Registration is currently closed.",
  event_not_found: "The event is not available.",
  no_eligible_participants: "There are no eligible participants for a draw.",
  draw_closed: "The lucky draw has been closed.",
  target_must_be_in_future: "The next target must be greater than the current registration count.",
  confirmation_mismatch: "The confirmation text does not match.",
  reason_required: "Please provide a reason of at least five characters.",
  claim_not_found: "The claim record was not found.",
};

export function messageFromError(error: unknown) {
  const raw = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "unknown_error";

  const key = Object.keys(publicMessages).find((candidate) =>
    raw.includes(candidate),
  );

  return key ? publicMessages[key] : "Something went wrong. Please try again.";
}

export function apiError(error: unknown, status = 400) {
  return NextResponse.json({ error: messageFromError(error) }, { status });
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
