import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

export default async function HomeCheckupsAdminPage() {
  const { data, error } = await createAdminSupabaseClient()
    .from("home_checkup_surveys")
    .select("id, full_name, age, phone, address, home_ownership, years_in_home, needs_checkup, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  const surveys = (data ?? []) as HomeCheckupSurvey[];

  return (
    <>
      <header className="admin-topbar">
        <div><p>Armson Homes</p><h1>Home checkup surveys</h1></div>
        <div className="event-state"><span />{surveys.filter((survey) => survey.needs_checkup).length} interested</div>
      </header>
      <main className="admin-content">
        <section className="admin-card">
          <div className="section-head"><div><p className="section-kicker">Home checkup interest</p><h2>{surveys.length} responses</h2></div></div>
          <p className="home-survey-privacy">Residential addresses are private. Use them only for the stated survey purpose; do not send them to Armson Homes without the participant’s direct request.</p>
          <div className="table-scroll">
            <table className="admin-table home-survey-table">
              <thead><tr><th>Name / age</th><th>Phone</th><th>Home</th><th>Address</th><th>Checkup</th><th>Submitted</th></tr></thead>
              <tbody>
                {surveys.map((survey) => (
                  <tr key={survey.id}>
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
        </section>
      </main>
    </>
  );
}
