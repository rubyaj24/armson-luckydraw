"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const links = [
  { href: "/admin", label: "Overview", icon: "◫" },
  { href: "/admin/participants", label: "Participants", icon: "◎" },
  { href: "/admin/stage", label: "Draw stage", icon: "✦" },
];

export function AdminShell({ children, email }: { children: React.ReactNode; email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await createBrowserSupabaseClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand"><span>A</span><div>Festival<small>Lucky Draw</small></div></Link>
        <nav>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "active" : ""}>
              <b>{link.icon}</b>{link.label}
            </Link>
          ))}
          <a href="/api/admin/export"><b>⇩</b>Export CSV</a>
          <Link href="/" target="_blank"><b>↗</b>Public page</Link>
        </nav>
        <div className="admin-user">
          <div className="avatar">A</div>
          <div><strong>Administrator</strong><span>{email}</span></div>
          <button onClick={logout} title="Sign out">↪</button>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
