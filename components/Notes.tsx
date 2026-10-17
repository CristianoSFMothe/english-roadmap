"use client";

import type { Week } from "@/lib/content";
import { dayKey } from "@/lib/content";

export default function Notes({
  week,
  notes,
  setNotes,
}: {
  week: Week;
  notes: Record<string, string>;
  setNotes: (next: (prev: Record<string, string>) => Record<string, string>) => void;
}) {
  const weekNote = notes[`w${week.n}`] ?? "";
  const filled = week.days.filter((_, i) => (notes[dayKey(week.n, i)] ?? "").trim()).length;

  const set = (key: string, value: string) =>
    setNotes((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <section className="card">
        <div className="section-title">
          <h2>Anotações da semana {week.n}</h2>
          <span>O que travou, o que ficou fácil, erros que se repetem</span>
        </div>
        <div className="field">
          <label htmlFor={`note-week-${week.n}`}>Registro da semana</label>
          <textarea
            id={`note-week-${week.n}`}
            value={weekNote}
            onChange={(e) => set(`w${week.n}`, e.target.value)}
            placeholder={`Tema: ${week.theme}.\nUma vitória:\nUma dificuldade:\nErro que se repete:`}
            style={{ minHeight: 140 }}
          />
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Anotações por dia</h2>
          <span>
            {filled} de {week.days.length} dias com anotação
          </span>
        </div>
        <div className="notes-grid">
          {week.days.map((d, i) => {
            const key = dayKey(week.n, i);
            return (
              <div className="note-day" key={key}>
                <span className="head">
                  <b>{d.label}</b> · {d.focus}
                </span>
                <textarea
                  id={`notes-${key}`}
                  value={notes[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder="Dúvidas, palavras novas, frases que você quer decorar"
                  style={{ minHeight: 64 }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Frases do dia desta semana</h2>
          <span>Use estas frases como ponto de partida para falar em voz alta</span>
        </div>
        <ul className="grammar-examples">
          {week.days.map((d, i) => (
            <li key={i}>
              <span className="dow" style={{ fontSize: 11, color: "var(--faint)" }}>
                {d.label}
              </span>
              <br />
              <span className="en">{d.speak}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
