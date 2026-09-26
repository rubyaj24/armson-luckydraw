import Link from "next/link";

export default function RulesPage() {
  return (
    <main className="legal-shell">
      <Link href="/" className="back-link">← Back to registration</Link>
      <div className="legal-card">
        <p className="panel-kicker">Armson Homes presents CETalks Spotlight 2026</p>
        <h1>Lucky-draw rules</h1>
        <p>These rules should be reviewed by the event organiser’s legal adviser before launch.</p>
        <ol>
          <li>Entry is free and open to people aged 18 or older.</li>
          <li>Only one entry is permitted per email address and mobile number.</li>
          <li>One winner is selected at the end of October 3 and one at the end of October 4.</li>
          <li>Each daily draw considers every eligible participant registered at that time. Day-one non-winners remain eligible on day two.</li>
          <li>A selected winner cannot win again, and a completed daily draw cannot be rerun.</li>
          <li>Winners are contacted by email and must verify their submitted information at the festival help desk.</li>
          <li>The prize must be claimed before the help desk closes on the day of selection.</li>
          <li>No replacement draw is held for an absent, rejected, or unclaimed winner.</li>
          <li>The organiser may pause registration or permanently close the lucky draw.</li>
        </ol>
      </div>
    </main>
  );
}
