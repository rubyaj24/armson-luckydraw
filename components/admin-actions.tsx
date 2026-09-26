"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { DrawRecord, EventRecord } from "@/lib/types";

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Action failed.");
  return result;
}

export function EventActions({ event, eligibleCount }: { event: EventRecord; eligibleCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showClose, setShowClose] = useState(false);

  async function execute(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    setNotice("");
    try {
      await action();
      setNotice(`${label} completed.`);
      router.refresh();
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function manualDraw() {
    if (!confirm(`Select one winner from ${eligibleCount} eligible participants?`)) return;
    const reason = prompt("Reason for this manual draw:");
    if (!reason) return;
    await execute("Manual draw", () => post("/api/admin/draw", { reason }));
  }

  async function toggleRegistration() {
    const target = event.registration_status === "open" ? "paused" : "open";
    const reason = prompt(`Reason to set registration to ${target}:`);
    if (!reason) return;
    await execute("Registration update", () =>
      post("/api/admin/registration-status", { status: target, reason }),
    );
  }

  return (
    <>
      <div className="action-row">
        <button className="admin-button primary" onClick={manualDraw} disabled={Boolean(busy) || event.draw_status === "closed" || eligibleCount === 0}>✦ Run manual draw</button>
        <button className="admin-button" onClick={toggleRegistration} disabled={Boolean(busy) || event.draw_status === "closed"}>{event.registration_status === "open" ? "Ⅱ Pause entries" : "▶ Resume entries"}</button>
        <button className="admin-button" onClick={() => setShowSettings(true)} disabled={Boolean(busy) || event.draw_status === "closed"}>⚙ Draw settings</button>
        <button className="admin-button danger" onClick={() => setShowClose(true)} disabled={Boolean(busy) || event.draw_status === "closed"}>Close lucky draw</button>
      </div>
      {notice && <div className="admin-notice">{notice}</div>}

      {showSettings && (
        <Modal title="Automatic draw settings" onClose={() => setShowSettings(false)}>
          <form onSubmit={(formEvent) => {
            formEvent.preventDefault();
            const form = new FormData(formEvent.currentTarget);
            execute("Settings update", () => post("/api/admin/settings", {
              nextTarget: form.get("nextTarget"), interval: form.get("interval"), reason: form.get("reason"),
            })).then((succeeded) => { if (succeeded) setShowSettings(false); });
          }}>
            <p className="modal-note">The real registration count ({event.valid_registration_count}) cannot be edited. Changes affect future draws only.</p>
            {notice && <div className="admin-notice">{notice}</div>}
            <div className="form-grid">
              <div className="field"><label>Next draw at</label><input name="nextTarget" type="number" min={event.valid_registration_count + 1} defaultValue={event.next_auto_draw_at} required /></div>
              <div className="field"><label>Repeat every</label><input name="interval" type="number" min={1} defaultValue={event.auto_draw_interval} required /></div>
            </div>
            <div className="field"><label>Reason for change</label><textarea name="reason" rows={3} minLength={5} required /></div>
            <button className="admin-button primary wide" disabled={Boolean(busy)}>Save settings</button>
          </form>
        </Modal>
      )}

      {showClose && (
        <Modal title="Permanently close lucky draw" danger onClose={() => setShowClose(false)}>
          <form onSubmit={(formEvent) => {
            formEvent.preventDefault();
            const form = new FormData(formEvent.currentTarget);
            execute("Lucky draw closure", () => post("/api/admin/close", {
              confirmation: form.get("confirmation"), reason: form.get("reason"),
            })).then((succeeded) => { if (succeeded) setShowClose(false); });
          }}>
            <p className="modal-note danger-text">This permanently stops registrations and all future draws. Claims and email retries remain available.</p>
            {notice && <div className="admin-notice">{notice}</div>}
            <div className="closure-summary"><span>Registrations<strong>{event.valid_registration_count}</strong></span><span>Eligible<strong>{eligibleCount}</strong></span></div>
            <div className="field"><label>Type CLOSE LUCKY DRAW</label><input name="confirmation" autoComplete="off" required /></div>
            <div className="field"><label>Reason for closure</label><textarea name="reason" rows={3} minLength={5} required /></div>
            <button className="admin-button solid-danger wide" disabled={Boolean(busy)}>Permanently close</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, children, onClose, danger = false }: { title: string; children: React.ReactNode; onClose: () => void; danger?: boolean }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`admin-modal ${danger ? "danger-modal" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button onClick={onClose} aria-label="Close">×</button></header>
        {children}
      </section>
    </div>
  );
}

export function WinnerActions({ draw }: { draw: DrawRecord }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setClaim(event: FormEvent<HTMLSelectElement>) {
    setBusy(true);
    setError("");
    try {
      await post(`/api/admin/claims/${draw.id}`, { status: event.currentTarget.value, notes: "Updated from dashboard" });
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Update failed.");
    } finally { setBusy(false); }
  }

  async function retry() {
    setBusy(true);
    try {
      await post(`/api/admin/notifications/${draw.id}/retry`, {});
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Retry failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="winner-actions">
      <select value={draw.claim?.status ?? "pending"} onChange={setClaim} disabled={busy} aria-label="Claim status">
        <option value="pending">Pending claim</option>
        <option value="claimed">Claimed</option>
        <option value="unclaimed">Unclaimed</option>
        <option value="rejected">Rejected</option>
      </select>
      {draw.notification?.status !== "sent" && <button onClick={retry} disabled={busy}>Retry email</button>}
      {error && <small>{error}</small>}
    </div>
  );
}
