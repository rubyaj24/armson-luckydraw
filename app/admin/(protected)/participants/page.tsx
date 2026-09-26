import Link from "next/link";
import { searchParticipants } from "@/lib/admin-data";

export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const query = params.q ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const { participants, total, pageSize } = await searchParticipants(query, page);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <header className="admin-topbar"><div><p>Event database</p><h1>Participants</h1></div><a className="admin-button" href="/api/admin/export">⇩ Export CSV</a></header>
      <main className="admin-content">
        <section className="admin-card participant-table-card">
          <div className="section-head participant-search-head">
            <div><p className="section-kicker">{total.toLocaleString("en-IN")} records</p><h2>Registration directory</h2></div>
            <form className="search-form"><input name="q" defaultValue={query} placeholder="Search name, email, phone or ID" /><button>Search</button></form>
          </div>
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr><th>#</th><th>Participant</th><th>Contact</th><th>Age / City</th><th>Lucky-draw ID</th><th>Status</th></tr></thead>
              <tbody>
                {participants.map((participant) => (
                  <tr key={participant.id}>
                    <td>{participant.registration_sequence}</td>
                    <td><strong>{participant.name}</strong><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(participant.created_at))}</small></td>
                    <td>{participant.email}<small>{participant.phone}</small></td>
                    <td>{participant.age}<small>{participant.city}</small></td>
                    <td><code>{participant.lucky_draw_id}</code></td>
                    <td><span className={`status-pill ${participant.status}`}>{participant.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!participants.length && <div className="empty-state">No participants match this search.</div>}
          </div>
          <div className="pagination">
            {page > 1 ? <Link href={`/admin/participants?q=${encodeURIComponent(query)}&page=${page - 1}`}>← Previous</Link> : <span />}
            <span>Page {page} of {pages}</span>
            {page < pages ? <Link href={`/admin/participants?q=${encodeURIComponent(query)}&page=${page + 1}`}>Next →</Link> : <span />}
          </div>
        </section>
      </main>
    </>
  );
}
