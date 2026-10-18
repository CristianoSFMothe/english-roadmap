"use client";

import { useEffect, useRef, useState } from "react";
import type { RawWeek } from "@/lib/content";
import type { OutlineItem } from "@/lib/normalize";
import type { Profile } from "@/lib/profile";

export type GeneratedPlan = {
  id: string;
  createdAt: number;
  profile: Profile;
  weeks: RawWeek[];
};

type Config = {
  serverKey: boolean;
  requiresCode: boolean;
  allowOwnKey: boolean;
  signedIn?: boolean;
  restricted?: boolean;
  model: string;
};

type Props = {
  profile: Profile;
  apiKey: string;
  setApiKey: (v: string) => void;
  accessCode: string;
  setAccessCode: (v: string) => void;
  onDone: (plan: GeneratedPlan) => void;
  onClose: () => void;
};

export default function Generator({
  profile,
  apiKey,
  setApiKey,
  accessCode,
  setAccessCode,
  onDone,
  onClose,
}: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState("");
  const [doneWeeks, setDoneWeeks] = useState<RawWeek[]>([]);
  const [error, setError] = useState("");
  const cancelled = useRef(false);

  useEffect(() => {
    fetch("/api/plan")
      .then((r) => r.json())
      .then((c: Config) => setConfig(c))
      .catch(() => setConfig({ serverKey: false, requiresCode: false, allowOwnKey: true, model: "" }));
    return () => {
      cancelled.current = true;
    };
  }, []);

  const needsKey = config ? !config.serverKey && config.allowOwnKey : false;
  const canStart = config ? config.serverKey || apiKey.trim().length > 10 : false;
  const semConta = Boolean(config?.serverKey && config?.restricted && !config?.signedIn);

  const call = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        profile,
        apiKey: apiKey.trim() || undefined,
        accessCode: accessCode.trim() || undefined,
      }),
    });
    const data = (await res.json()) as { error?: string; outline?: OutlineItem[]; week?: RawWeek };
    if (!res.ok) throw new Error(data.error || "Falha na geração.");
    return data;
  };

  const run = async () => {
    cancelled.current = false;
    setRunning(true);
    setError("");
    setDoneWeeks([]);
    try {
      setStep("Montando o esboço das semanas…");
      const { outline } = await call({ stage: "outline" });
      if (!outline?.length) throw new Error("O esboço veio vazio.");

      const themes = outline.map((o) => `${o.n}. ${o.theme}`);
      const weeks: RawWeek[] = [];

      for (const item of outline) {
        if (cancelled.current) return;
        setStep(`Semana ${item.n} de ${outline.length}: ${item.theme}`);
        const { week } = await call({ stage: "week", item, outlineThemes: themes });
        if (!week) throw new Error(`A semana ${item.n} não foi gerada.`);
        weeks.push(week);
        setDoneWeeks([...weeks]);
      }

      if (cancelled.current) return;
      onDone({
        id: `plan-${Date.now()}`,
        createdAt: Date.now(),
        profile,
        weeks,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na geração.");
    } finally {
      setRunning(false);
      setStep("");
    }
  };

  const total = profile.weeks;
  const pct = Math.round((doneWeeks.length / total) * 100);

  return (
    <div className="scrim" onClick={running ? undefined : onClose} role="presentation">
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Gerar plano"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <h2>Gerar meu plano</h2>
          </div>
          {!running && (
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          )}
        </div>

        {!config && <p className="empty">Verificando a configuração…</p>}

        {config && needsKey && (
          <div className="field">
            <label htmlFor="gen-key">Sua chave da API da Anthropic</label>
            <input
              id="gen-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
            />
            <span style={{ fontSize: 12, color: "var(--faint)" }}>
              A chave fica salva só no seu navegador e é usada apenas para chamar a API em
              seu nome. Você a cria em console.anthropic.com. A geração de 12 semanas
              costuma custar poucos centavos de dólar.
            </span>
          </div>
        )}

        {config?.requiresCode && (
          <div className="field">
            <label htmlFor="gen-code">Código de acesso</label>
            <input
              id="gen-code"
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="código combinado com o dono do site"
              autoComplete="off"
            />
          </div>
        )}

        {semConta && (
          <div className="tip" style={{ background: "var(--warn-soft)" }}>
            <b>Este site é de uso pessoal. </b>
            Entre com a conta autorizada (botão no topo) ou informe o código de acesso
            para gerar com a chave do dono. Com a sua própria chave da Anthropic, a
            geração funciona sem login.
          </div>
        )}

        <div className="tip">
          <b>Como funciona: </b>
          primeiro a Inteligência Artificial monta o esboço das {total} semanas e depois
          desenvolve uma por uma, com vocabulário, recursos e as atividades de cada dia.
          Leva alguns minutos. Deixe esta janela aberta.
        </div>

        {running && (
          <>
            <div className="bar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <p style={{ fontSize: 13.5 }}>{step}</p>
            <p style={{ fontSize: 12, color: "var(--faint)" }}>
              {doneWeeks.length} de {total} semanas prontas
            </p>
          </>
        )}

        {error && (
          <p className="tip" style={{ background: "var(--warn-soft)" }}>
            <b>Não deu certo: </b>
            {error}
          </p>
        )}

        {!running && (
          <div className="fc-actions">
            <button className="btn" onClick={onClose}>
              Agora não
            </button>
            <button className="btn primary" onClick={run} disabled={!canStart}>
              {error ? "Tentar de novo" : "Gerar plano"}
            </button>
          </div>
        )}

        {running && (
          <button
            className="btn"
            onClick={() => {
              cancelled.current = true;
              setRunning(false);
            }}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
