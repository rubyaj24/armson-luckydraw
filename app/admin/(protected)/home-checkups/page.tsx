import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

type HomeCheckupSurvey = {
  id: string;
  full_name: string;
  age: number;
  phone: string | null;
  address: string;
  home_ownership: "owned" | "rented";
  years_in_home: number | string;
  needs_checkup: boolean;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

const PAGE_SIZE = 50;

export default async function HomeCheckupsAdminPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Math.max(1, Number(params.page) || 1);
  const supabase = createAdminSupabaseClient();
  const [{ count, error: countError }, { count: interestedCount, error: interestedError }] = await Promise.all([
    supabase.from("home_checkup_surveys").select("id", { count: "exact", head: true }),
    supabase.from("home_checkup_surveys").select("id", { count: "exact", head: true }).eq("needs_checkup", true),
  ]);

  if (countError) throw countError;
  if (interestedError) throw interestedError;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const from = (page - 1) * PAGE_SIZE;
  const { data, error } = await supabase
    .from("home_checkup_surveys")
    .select("id, full_name, age, phone, address, home_ownership, years_in_home, needs_checkup, created_at")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) throw error;
  const surveys = (data ?? []) as HomeCheckupSurvey[];

  return (
    <>
      <header className="admin-topbar">
        <div><p>Armson Homes</p><h1>Home checkup surveys</h1></div>
        <div className="event-state"><span />{(interestedCount ?? 0).toLocaleString("en-IN")} interested</div>
      </header>
      <main className="admin-content">
        <section className="admin-card">
          <div className="section-head"><div><p className="section-kicker">Home checkup survey</p><h2>Total queries: {total.toLocaleString("en-IN")}</h2></div></div>
          <p className="home-survey-privacy">Residential addresses are private. Use them only for the stated survey purpose; do not send them to Armson Homes without the participant’s direct request.</p>
          <div className="table-scroll">
            <table className="admin-table home-survey-table">
              <thead><tr><th>No.</th><th>Name / age</th><th>Phone</th><th>Home</th><th>Address</th><th>Checkup</th><th>Submitted</th></tr></thead>
              <tbody>
                {surveys.map((survey, index) => (
                  <tr key={survey.id}>
                    <td>{from + index + 1}</td>
                    <td><strong>{survey.full_name}</strong><small>{survey.age} years</small></td>
                    <td>{survey.phone ? <a href={`tel:${survey.phone}`}>{survey.phone}</a> : <small>Not provided</small>}</td>
                    <td><strong>{survey.home_ownership === "owned" ? "Owned" : "Rented"}</strong><small>{survey.years_in_home} years</small></td>
                    <td className="home-survey-address">{survey.address}</td>
                    <td><span className={`status-pill ${survey.needs_checkup ? "pending" : "claimed"}`}>{survey.needs_checkup ? "Interested" : "No"}</span></td>
                    <td><small>{formatDate(survey.created_at)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!surveys.length && <div className="empty-state">No home checkup survey responses yet.</div>}
          </div>
          <nav className="pagination" aria-label="Survey pages">
            {page > 1 ? <Link href={`/admin/home-checkups?page=${page - 1}`}>← Previous</Link> : <span />}
            <span>Page {page} of {totalPages} · showing {surveys.length} of {total.toLocaleString("en-IN")}</span>
            {page < totalPages ? <Link href={`/admin/home-checkups?page=${page + 1}`}>Next →</Link> : <span />}
          </nav>
        </section>
      </main>
    </>
  );
}
