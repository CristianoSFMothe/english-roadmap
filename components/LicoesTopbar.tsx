"use client";

import Link from "next/link";
import AuthBar from "./AuthBar";

/** Cabeçalho das páginas das Lições, com o menu de sempre. */
export default function LicoesTopbar({ title, authEnabled }: { title: string; authEnabled: boolean }) {
  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <div className="topbar-row">
          <div className="brand">
            <span>Trilha de inglês</span>
            <strong>{title}</strong>
          </div>
          <div className="head-actions">
            <Link className="btn small" href="/estudo-diario">
              Estudo do dia
            </Link>
            <Link className="btn small" href="/vocabulario">
              Vocabulário
            </Link>
            <Link className="btn small" href="/preferencias">
              Preferências
            </Link>
            <Link className="btn small" href="/">
              ← Voltar ao plano
            </Link>
            <AuthBar enabled={authEnabled} syncing={false} canExport={false} onExport={() => {}} />
          </div>
        </div>
      </div>
    </header>
  );
}
