export type RegistrationResult = {
  participant_id: string;
  lucky_draw_id: string;
  registration_sequence: number;
  draw_triggered: boolean;
  draw_id: string | null;
  was_existing: boolean;
};

export type EventRecord = {
  id: string;
  slug: string;
  name: string;
  code: string;
  starts_on: string;
  ends_on: string;
  timezone: string;
  registration_status: "open" | "paused" | "closed";
  draw_status: "active" | "closed";
  valid_registration_count: number;
  next_auto_draw_at: number;
  auto_draw_interval: number;
  helpdesk_close_time: string | null;
  closed_at: string | null;
};

export type ParticipantRecord = {
  id: string;
  name: string;
  age: number;
  city: string;
  email: string;
  phone: string;
  lucky_draw_id: string;
  registration_sequence: number;
  status: "eligible" | "winner" | "disqualified";
  created_at: string;
};

export type DrawRecord = {
  id: string;
  kind: "automatic" | "manual";
  milestone: number | null;
  eligible_count: number;
  created_at: string;
  participant: Pick<
    ParticipantRecord,
    "id" | "name" | "email" | "phone" | "lucky_draw_id"
  > | null;
  claim: {
    status: "pending" | "claimed" | "unclaimed" | "rejected";
    claim_deadline: string;
    notes: string | null;
  } | null;
  notification: {
    status: "pending" | "sent" | "failed";
    attempts: number;
    last_error: string | null;
  } | null;
};
