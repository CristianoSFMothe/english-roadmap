import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_PAGES, LEGAL_UPDATED_AT } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";

/** Moldura das páginas públicas de privacidade e termos. */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="topbar-row">
            <div className="brand">
              <span>{SITE_NAME}</span>
              <strong>{title}</strong>
            </div>
            <div className="head-actions">
              <Link className="btn small" href="/">
                ← Voltar ao app
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="wrap study-page">
        <article className="panel legal">
          <p className="study-week">Última atualização: {LEGAL_UPDATED_AT}</p>
          {children}
          <nav className="legal-links" aria-label="Páginas legais">
            {LEGAL_PAGES.map((p) => (
              <Link key={p.href} href={p.href}>
                {p.title}
              </Link>
            ))}
          </nav>
        </article>
      </main>
    </>
  );
}
