"use client";

import { useMemo, useState } from "react";
import type { RawWeek, Week } from "@/lib/content";
import { buildWeeks, dayKey, totalsOf } from "@/lib/content";
import { emptyProfile, sampleProfile, type Profile } from "@/lib/profile";
import { usePersistentState } from "@/lib/storage";
import DayDrawer from "./DayDrawer";
import Flashcards from "./Flashcards";
import Notes from "./Notes";
import ProfileForm from "./ProfileForm";
import Generator, { type GeneratedPlan } from "./Generator";

type Tab = "plan" | "cards" | "notes";

export function Check() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2 6.4 4.6 9 10 3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Roadmap({ sample }: { sample: RawWeek[] }) {
  const [plan, setPlan] = usePersistentState<GeneratedPlan | null>("plan", null);
  const [profile, setProfile] = usePersistentState<Profile>("profile", sampleProfile);
  const [profileSaved, setProfileSaved] = usePersistentState<boolean>("profileSaved", false);
  const [apiKey, setApiKey] = usePersistentState<string>("apiKey", "");
  const [accessCode, setAccessCode] = usePersistentState<string>("accessCode", "");

  const planId = plan?.id ?? "sample";
  const [done, setDone] = usePersistentState<Record<string, boolean>>(`done:${planId}`, {});
  const [known, setKnown] = usePersistentState<Record<string, boolean>>(`known:${planId}`, {});
  const [notes, setNotes] = usePersistentState<Record<string, string>>(`notes:${planId}`, {});
  const [weekN, setWeekN] = usePersistentState<number>(`week:${planId}`, 1);

  const [tab, setTab] = useState<Tab>("plan");
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const weeks: Week[] = useMemo(
    () => buildWeeks(plan?.weeks ?? sample),
    [plan, sample],
  );
  const totals = useMemo(() => totalsOf(weeks), [weeks]);

  const week = weeks.find((w) => w.n === weekN) ?? weeks[0];

  const doneCount = useMemo(
    () => weeks.reduce((sum, w) => sum + w.days.filter((_, i) => done[dayKey(w.n, i)]).length, 0),
    [weeks, done],
  );
  const knownCount = useMemo(
    () => weeks.reduce((s, w) => s + w.cards.filter((c) => known[c.id]).length, 0),
    [weeks, known],
  );

  const pct = totals.days ? Math.round((doneCount / totals.days) * 100) : 0;
  const weekDone = week.days.filter((_, i) => done[dayKey(week.n, i)]).length;
  const weekMinutes = week.days.reduce((s, d) => s + d.minutes, 0);
  const isSample = !plan;

  const toggleDay = (index: number) => {
    const key = dayKey(week.n, index);
    setDone((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="topbar-row">
            <div className="brand">
              <span>
                Trilha de inglês · {profile.level} → {profile.target}
              </span>
              <strong>
                {isSample
                  ? "Plano de exemplo"
                  : `Meu plano · ${weeks.length} semana${weeks.length > 1 ? "s" : ""}`}
              </strong>
            </div>
            <div className="head-actions">
              <div className="pct">
                <b>{pct}%</b>
                <small>
                  {doneCount} de {totals.days} dias
                </small>
              </div>
              <button className="btn small" onClick={() => setShowProfile(true)}>
                Meu perfil
              </button>
            </div>
          </div>
          <div
            className="bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso geral"
          >
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="stats">
            <span>
              <b>{knownCount}</b> de {totals.cards} palavras marcadas como sabidas
            </span>
            <span>
              <b>{Math.round((totals.minutes / 60) * 10) / 10} h</b> de estudo planejadas
            </span>
            <span>
              Semana atual: <b>{week.n}</b>
            </span>
          </div>
        </div>
      </header>

      <div className="wrap">
        {isSample && (
          <div className="callout">
            <div>
              <strong>Este é um plano de exemplo.</strong>
              <span>
                Informe seu nível, suas dificuldades, seus objetivos e o que você gosta de
                assistir, ler e ouvir. A Claude monta um plano inteiro no seu ritmo.
              </span>
            </div>
            <button className="btn primary" onClick={() => setShowProfile(true)}>
              Montar o meu plano
            </button>
          </div>
        )}

        <div className="weeks-rail" role="tablist" aria-label="Semanas">
          {weeks.map((w) => {
            const d = w.days.filter((_, i) => done[dayKey(w.n, i)]).length;
            const complete = d === w.days.length;
            return (
              <button
                key={w.n}
                role="tab"
                aria-selected={w.n === week.n}
                className={`week-chip${complete ? " complete" : ""}`}
                onClick={() => {
                  setWeekN(w.n);
                  setTab("plan");
                }}
              >
                <span className="wk">
                  Semana {w.n} · {d}/{w.days.length}
                </span>
                <span className="th">{w.theme}</span>
                <span className="mini-bar">
                  <i style={{ width: `${(d / w.days.length) * 100}%` }} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="wrap">
        <section className="hero">
          <div className="eyebrow">
            <span>Semana {week.n}</span>
            <span>·</span>
            <span>{week.phase}</span>
            <span>·</span>
            <span>
              {weekDone}/{week.days.length} dias · {weekMinutes} min
            </span>
          </div>
          <h1>{week.theme}</h1>
          {week.subtitle && <p className="sub">{week.subtitle}</p>}
          {week.why && <p className="why">{week.why}</p>}
          {week.milestone && (
            <div className="goal">
              <span>Meta</span>
              <span>{week.milestone}</span>
            </div>
          )}
        </section>

        <div className="tabs" role="tablist" aria-label="Conteúdo da semana">
          <button role="tab" aria-selected={tab === "plan"} className="tab" onClick={() => setTab("plan")}>
            Plano da semana
          </button>
          <button role="tab" aria-selected={tab === "cards"} className="tab" onClick={() => setTab("cards")}>
            Flashcards <span className="count">{week.vocabCount}</span>
          </button>
          <button role="tab" aria-selected={tab === "notes"} className="tab" onClick={() => setTab("notes")}>
            Anotações
          </button>
        </div>

        {tab === "plan" && (
          <div className="panel">
            <section>
              <div className="section-title">
                <h2>Atividade diária</h2>
                <span>Clique no dia para ver o que estudar, em qual recurso e por quantos minutos</span>
              </div>
              <div className="days">
                {week.days.map((d, i) => {
                  const isDone = !!done[dayKey(week.n, i)];
                  return (
                    <button
                      key={i}
                      className={`day${isDone ? " done" : ""}`}
                      onClick={() => setOpenDay(i)}
                      aria-label={`${d.label}: ${d.focus}. ${isDone ? "Concluído" : "Não concluído"}`}
                    >
                      <span className="day-top">
                        <span className="dow">{d.label}</span>
                        <span
                          className="tick"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDay(i);
                          }}
                          role="checkbox"
                          aria-checked={isDone}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleDay(i);
                            }
                          }}
                        >
                          {isDone ? <Check /> : null}
                        </span>
                      </span>
                      <span className="focus">{d.focus}</span>
                      <span className="mins">{d.minutes} min</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="card">
              <div className="section-title">
                <h2>Gramática: {week.grammar.topic}</h2>
              </div>
              {week.grammar.why && (
                <p style={{ fontSize: 13.5, color: "var(--muted)" }}>{week.grammar.why}</p>
              )}
              <ul className="grammar-examples">
                {week.grammar.examples.map((ex, i) => (
                  <li key={i} className="en">
                    {ex}
                  </li>
                ))}
              </ul>
              {week.grammar.tip && (
                <p className="tip">
                  <b>Atenção: </b>
                  {week.grammar.tip}
                </p>
              )}
            </section>

            <section className="card">
              <div className="section-title">
                <h2>Vocabulário</h2>
                <span>{week.vocabCount} itens · estude pelos flashcards, no máximo 5 novos por dia</span>
              </div>
              {week.vocabGroups.map((g) => (
                <div className="vocab-group" key={g.group}>
                  <h3>
                    {g.group} · {g.cards.length}
                  </h3>
                  <ul className="vocab-list">
                    {g.cards.map((c) => (
                      <li key={c.id}>
                        <span className="en">{c.en}</span>
                        <span className="pt">{c.pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <div
              style={{
                display: "grid",
                gap: 18,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {week.resources.length > 0 && (
                <section className="card">
                  <div className="section-title">
                    <h2>Recursos da semana</h2>
                  </div>
                  <ul className="res-list">
                    {week.resources.map((r, i) => (
                      <li key={i}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          {r.name}
                        </a>
                        <span className="what">{r.what}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {week.content.length > 0 && (
                <section className="card">
                  <div className="section-title">
                    <h2>Conteúdos para consumir</h2>
                  </div>
                  <ul className="res-list">
                    {week.content.map((c, i) => (
                      <li key={i}>
                        <span>
                          <span className="kind">{c.kind}</span>
                          {c.name}
                        </span>
                        <span className="what">{c.what}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        )}

        {tab === "cards" && (
          <div className="panel">
            <Flashcards week={week} known={known} setKnown={setKnown} />
          </div>
        )}

        {tab === "notes" && (
          <div className="panel">
            <Notes week={week} notes={notes} setNotes={setNotes} />
          </div>
        )}

        <footer>
          <span>
            Seu progresso, suas anotações e os flashcards ficam salvos neste navegador.
            Trocar de navegador ou limpar os dados do site apaga o histórico.
          </span>
          {!isSample && (
            <span>
              Plano gerado em{" "}
              {new Date(plan.createdAt).toLocaleDateString("pt-BR")} a partir do seu perfil.{" "}
              <button className="linkish" onClick={() => setShowGenerator(true)}>
                Gerar de novo
              </button>{" "}
              ·{" "}
              <button
                className="linkish"
                onClick={() => {
                  setPlan(null);
                  setWeekN(1);
                }}
              >
                Voltar ao plano de exemplo
              </button>
            </span>
          )}
        </footer>
      </main>

      {openDay !== null && week.days[openDay] && (
        <DayDrawer
          week={week}
          index={openDay}
          day={week.days[openDay]}
          isDone={!!done[dayKey(week.n, openDay)]}
          note={notes[dayKey(week.n, openDay)] ?? ""}
          onNote={(value) =>
            setNotes((prev) => ({ ...prev, [dayKey(week.n, openDay)]: value }))
          }
          onToggle={() => toggleDay(openDay)}
          onClose={() => setOpenDay(null)}
        />
      )}

      {showProfile && (
        <ProfileForm
          initial={
            profileSaved
              ? profile
              : { ...emptyProfile, level: profile.level, target: profile.target }
          }
          onSave={(p) => {
            setProfile(p);
            setProfileSaved(true);
            setShowProfile(false);
          }}
          onGenerate={(p) => {
            setProfile(p);
            setProfileSaved(true);
            setShowProfile(false);
            setShowGenerator(true);
          }}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showGenerator && (
        <Generator
          profile={profile}
          apiKey={apiKey}
          setApiKey={setApiKey}
          accessCode={accessCode}
          setAccessCode={setAccessCode}
          onDone={(generated) => {
            setPlan(generated);
            setWeekN(1);
            setTab("plan");
            setShowGenerator(false);
          }}
          onClose={() => setShowGenerator(false)}
        />
      )}
    </>
  );
}
