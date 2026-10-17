"use client";

import { useEffect, useRef } from "react";
import type { Day, Week } from "@/lib/content";
import { Check } from "./Roadmap";

export default function DayDrawer({
  week,
  index,
  day,
  isDone,
  note,
  onNote,
  onToggle,
  onClose,
}: {
  week: Week;
  index: number;
  day: Day;
  isDone: boolean;
  note: string;
  onNote: (value: string) => void;
  onToggle: () => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total = day.tasks.reduce((s, t) => s + t.min, 0);

  return (
    <div className="scrim" onClick={onClose} role="presentation">
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Semana ${week.n}, ${day.label}`}
        onClick={(e) => e.stopPropagation()}
        ref={panel}
        tabIndex={-1}
      >
        <div className="drawer-head">
          <div>
            <span className="dow">
              Semana {week.n} · {day.label} · {day.focus}
            </span>
            <h2>O que estudar hoje</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <ul className="tasks">
          {day.tasks.map((t, i) => (
            <li key={i}>
              <span className="what">
                {t.what}
                <span className="meta">Recurso: {t.resource}</span>
              </span>
              <span className="min">{t.min > 0 ? `${t.min} min` : "livre"}</span>
            </li>
          ))}
        </ul>

        <p style={{ fontSize: 12, color: "var(--faint)" }}>
          Tempo somado: {total} min {total !== day.minutes ? `(previsto: ${day.minutes} min)` : ""}
        </p>

        <div className="goal">
          <span>Frase</span>
          <span className="en">{day.speak}</span>
        </div>

        <div className="tip">
          <b>Dia cansado: </b>
          {day.mini}
        </div>

        <div className="field">
          <label htmlFor={`note-w${week.n}d${index}`}>
            Anotações do dia (dúvidas, erros que você cometeu, palavras novas)
          </label>
          <textarea
            id={`note-w${week.n}d${index}`}
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder="Ex.: travei em 'I didn't tested' — o certo é 'I didn't test'."
          />
        </div>

        <button
          className={`btn wide ${isDone ? "ok" : "primary"}`}
          onClick={onToggle}
        >
          {isDone ? (
            <>
              <Check /> Dia concluído
            </>
          ) : (
            "Marcar dia como concluído"
          )}
        </button>
      </div>
    </div>
  );
}
