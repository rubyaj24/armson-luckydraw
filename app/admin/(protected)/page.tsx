import Link from "next/link";
import { EventActions, WinnerActions } from "@/components/admin-actions";
import { getDashboardData } from "@/lib/admin-data";

function formatDate(value: string, includeTime = true) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export default async function AdminDashboard() {
  const { event, eligibleCount, recentParticipants, draws, auditLogs } = await getDashboardData();
  const remaining = Math.max(0, event.next_auto_draw_at - event.valid_registration_count);
  const previousTarget = Math.max(0, event.next_auto_draw_at - event.auto_draw_interval);
  const progress = Math.min(100, Math.max(0,
    ((event.valid_registration_count - previousTarget) / (event.next_auto_draw_at - previousTarget)) * 100,
  ));
  const claimedCount = draws.filter((draw) => draw.claim?.status === "claimed").length;

  return (
    <>
      <header className="admin-topbar">
        <div><p>October 3—4, 2026</p><h1>Good to see you.</h1></div>
        <div className={`event-state ${event.draw_status === "closed" ? "closed" : event.registration_status}`}><span />{event.draw_status === "closed" ? "Draw closed" : `Registration ${event.registration_status}`}</div>
      </header>

      <main className="admin-content">
        <section className="metric-grid">
          <article className="metric-card featured">
            <div className="metric-icon">◎</div><span>Total registrations</span><strong>{event.valid_registration_count.toLocaleString("en-IN")}</strong>
            <small>Permanent verified count</small>
          </article>
          <article className="metric-card"><div className="metric-icon">◇</div><span>Eligible now</span><strong>{eligibleCount.toLocaleString("en-IN")}</strong><small>Previous winners excluded</small></article>
          <article className="metric-card"><div className="metric-icon">✦</div><span>Draws completed</span><strong>{draws.length}</strong><small>{draws.filter((draw) => draw.kind === "manual").length} manual draws</small></article>
          <article className="metric-card"><div className="metric-icon">✓</div><span>Prizes claimed</span><strong>{claimedCount}</strong><small>{draws.length - claimedCount} awaiting or closed</small></article>
        </section>

        <section className="admin-card milestone-card">
          <div className="milestone-head">
            <div><p className="section-kicker">Next automatic draw</p><h2>{remaining === 0 ? "Ready now" : `${remaining} more ${remaining === 1 ? "entry" : "entries"}`}</h2></div>
            <div className="target-number"><span>Target</span><strong>{event.next_auto_draw_at}</strong></div>
          </div>
          <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
          <div className="progress-labels"><span>{event.valid_registration_count} registered</span><span>Repeats every {event.auto_draw_interval}</span></div>
          <EventActions event={event} eligibleCount={eligibleCount} />
        </section>

        <div className="dashboard-columns">
          <section className="admin-card">
            <div className="section-head"><div><p className="section-kicker">Live entries</p><h2>Recent participants</h2></div><Link href="/admin/participants">View all →</Link></div>
            <div className="participant-list">
              {recentParticipants.map((participant) => (
                <div className="participant-row" key={participant.id}>
                  <div className="participant-avatar">{participant.name.slice(0, 1).toUpperCase()}</div>
                  <div className="participant-main"><strong>{participant.name}</strong><span>{participant.city} · {participant.email}</span></div>
                  <div className="participant-id"><strong>{participant.lucky_draw_id}</strong><span>#{participant.registration_sequence}</span></div>
                </div>
              ))}
              {!recentParticipants.length && <div className="empty-state">No registrations yet.</div>}
            </div>
          </section>

          <section className="admin-card draw-history-card">
            <div className="section-head"><div><p className="section-kicker">Results</p><h2>Winner history</h2></div></div>
            <div className="winner-list">
              {draws.map((draw) => (
                <article className="winner-row" key={draw.id}>
                  <div className="winner-medal">✦</div>
                  <div className="winner-info">
                    <div className="winner-title"><strong>{draw.participant?.name ?? "Unknown winner"}</strong><span className={`status-pill ${draw.claim?.status}`}>{draw.claim?.status ?? "pending"}</span></div>
                    <p>{draw.participant?.lucky_draw_id} · {draw.kind === "automatic" ? `Milestone ${draw.milestone}` : "Manual draw"}</p>
                    <small>{formatDate(draw.created_at)} · Email {draw.notification?.status ?? "pending"}</small>
                    <WinnerActions draw={draw} />
                  </div>
                </article>
              ))}
              {!draws.length && <div className="empty-state">Winners will appear here after the first draw.</div>}
            </div>
          </section>
        </div>

        <section className="admin-card audit-card">
          <div className="section-head"><div><p className="section-kicker">Accountability</p><h2>Recent audit trail</h2></div></div>
          <div className="audit-list">
            {auditLogs.map((log) => (
              <div key={log.id}><span className="audit-dot" /><strong>{String(log.action).replaceAll("_", " ")}</strong><p>{log.reason || "System action"}</p><time>{formatDate(log.created_at)}</time></div>
            ))}
            {!auditLogs.length && <div className="empty-state">No sensitive actions recorded yet.</div>}
          </div>
        </section>
      </main>
    </>
  );
}
