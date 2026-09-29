import Link from "next/link";
import { PublicEventGate } from "@/components/public-event-gate";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <PublicEventGate>
    <main className="legal-shell">
      <Link href="/" className="back-link">← Back to registration</Link>
      <div className="legal-card">
        <p className="panel-kicker">Privacy notice</p>
        <h1>How your information is used</h1>
        <p>For the festival lucky draw, we collect your name, age, city, email address, and phone number to operate the draw, prevent duplicate entries, select winners, and verify prize claims.</p>
        <p>If you complete the optional home checkup survey, we collect your name, age, home address, home ownership status, length of residence, and whether you are interested in a home checkup. Event organisers can review these responses. Your home address is not sent to Armson Homes automatically; contact them yourself if you want to request a checkup.</p>
        <p>Your details are accessible only to authorised event staff and service providers required to operate the application. They are not displayed publicly.</p>
        <p>If you win, staff will inspect your identity document at the help desk. We do not store a copy or its identification number.</p>
        <p>The event organiser must add its contact details and final data-retention period here before launch.</p>
      </div>
    </main>
    </PublicEventGate>
  );
}
