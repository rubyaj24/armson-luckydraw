import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <Link href="/" className="back-link">← Back to registration</Link>
      <div className="legal-card">
        <p className="panel-kicker">Privacy notice</p>
        <h1>How your information is used</h1>
        <p>We collect your name, age, city, email address, and phone number to operate this festival lucky draw, prevent duplicate entries, select winners, and verify prize claims.</p>
        <p>Your details are accessible only to authorised event staff and service providers required to operate the application. They are not displayed publicly.</p>
        <p>If you win, staff will inspect your identity document at the help desk. We do not store a copy or its identification number.</p>
        <p>The event organiser must add its contact details and final data-retention period here before launch.</p>
      </div>
    </main>
  );
}
