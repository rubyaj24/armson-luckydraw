import Image from "next/image";
import Link from "next/link";
import { HomeCheckupForm } from "@/components/home-checkup-form";
import { PublicEventGate } from "@/components/public-event-gate";

export const metadata = {
  title: "Home Checkup | Armson Homes",
  description: "Tell us about your home and find out how to request a checkup from Armson Homes.",
};

export const dynamic = "force-dynamic";

export default function HomeCheckupPage() {
  return (
    <PublicEventGate>
    <main className="checkup-page">
      <div className="checkup-masthead">
        <header className="checkup-header">
          <Link className="checkup-logo" href="/" aria-label="Armson Homes — back to festival home">
            <Image src="/assets/Armson logo.png" alt="Armson Homes" width={100} height={100} priority />
          </Link>
          <div className="checkup-brand-copy"><strong>Armson Homes</strong><span>We build heavenly · Since 1998</span></div>
          <a className="checkup-header-contact" href="tel:+918111993111"><span>Speak with our team</span><strong>+91 8111 993 111</strong></a>
        </header>
      </div>

      <div className="checkup-layout">
        <section className="checkup-intro">
          <p className="checkup-eyebrow">We build heavenly · Home care initiative</p>
          <h1>Care for your<br /><em>home begins here.</em></h1>
          <p>Tell us a little about your home. If it could use a checkup, Armson Homes is here to help with maintenance, repairs and renovation advice.</p>
          <div className="checkup-service-note"><span>⌂</span><div><strong>Thoughtful care for every corner</strong><small>Maintenance · Repairs · Renovation advice</small></div></div>
          <div className="checkup-services" aria-label="Armson Homes service areas">
            <span>Plumbing</span><span>Electrical</span><span>Painting</span><span>Masonry</span>
          </div>
          <div className="checkup-since"><b>2,000+</b><span><strong>projects completed</strong><small>Homes and spaces, cared for by Armson</small></span></div>
          <a className="checkup-service-link" href="https://armsonhomes.in/service/maintenance/" target="_blank" rel="noreferrer">Explore Armson home maintenance <span aria-hidden="true">↗</span></a>
        </section>

        <section className="checkup-form-card">
          <div className="checkup-card-heading">
            <p className="panel-kicker">Home checkup survey</p>
            <h2>Let&apos;s get to know your home.</h2>
            <p>Share the basics below. Your response is securely available to event organisers; it is not automatically sent to Armson Homes.</p>
          </div>
          <HomeCheckupForm />
        </section>
      </div>

      <footer className="checkup-contact-footer">
        <span>Have a home-care question?</span>
        <a href="tel:+918111993111">Call Armson Homes · +91 8111 993 111</a>
        <a href="mailto:info@armsonhomes.in">info@armsonhomes.in</a>
        <a href="https://armsonhomes.in/contact-us/" target="_blank" rel="noreferrer">Visit Armson Homes ↗</a>
      </footer>
    </main>
    </PublicEventGate>
  );
}
