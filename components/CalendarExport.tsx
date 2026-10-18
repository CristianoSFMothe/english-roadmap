"use client";

import { useState } from "react";
import type { Week } from "@/lib/content";

function proximaSegunda(): string {
  const d = new Date();
  const faltam = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + faltam);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarExport({
  weeks,
  planId,
  onClose,
}: {
  weeks: Week[];
  planId: string;
  onClose: () => void;
}) {
  const [startDate, setStartDate] = useState(proximaSegunda());
  const [time, setTime] = useState("19:00");
  const [reminder, setReminder] = useState(10);
  const [newCalendar, setNewCalendar] = useState(true);
  const [calendarName, setCalendarName] = useState("Trilha de Inglês");
  const [fromWeek, setFromWeek] = useState(1);
  const [toWeek, setToWeek] = useState(Math.min(4, weeks.length));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");

  const selecionadas = weeks.filter((w) => w.n >= fromWeek && w.n <= toWeek);
  const totalEventos = selecionadas.reduce((s, w) => s + w.days.length, 0);

  const exportar = async () => {
    setRunning(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planId,
          weeks: selecionadas.map((w) => ({
            n: w.n,
            theme: w.theme,
            subtitle: w.subtitle,
            grammar: { topic: w.grammar.topic },
            milestone: w.milestone,
            days: w.days,
          })),
          startDate,
          time,
          reminderMinutes: reminder,
          newCalendar,
          calendarName,
          fromWeek,
          toWeek,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        created?: number;
        failed?: number;
        calendarName?: string;
      };
      if (!res.ok) throw new Error(data.error || "Falha ao exportar.");
      setResult(
        `${data.created} evento${data.created === 1 ? "" : "s"} criado${data.created === 1 ? "" : "s"} em "${data.calendarName}".` +
          (data.failed ? ` ${data.failed} falharam.` : ""),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao exportar.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="scrim" role="presentation">
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Exportar para o Google Agenda">
        <div className="drawer-head">
          <div>
            <span className="dow">Google Agenda</span>
            <h2>Colocar o plano na agenda</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
          Cada dia de estudo vira um evento com as tarefas, o recurso, os minutos e a frase do
          dia na descrição. Comece numa segunda-feira para os rótulos baterem com os dias.
        </p>

        <div className="row-2">
          <div className="field">
            <label htmlFor="cal-date">Primeiro dia</label>
            <input
              id="cal-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="cal-time">Horário</label>
            <input
              id="cal-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="row-3">
          <div className="field">
            <label htmlFor="cal-from">Da semana</label>
            <input
              id="cal-from"
              type="number"
              min={1}
              max={weeks.length}
              value={fromWeek}
              onChange={(e) => setFromWeek(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="cal-to">Até a semana</label>
            <input
              id="cal-to"
              type="number"
              min={1}
              max={weeks.length}
              value={toWeek}
              onChange={(e) => setToWeek(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="cal-reminder">Lembrete (min antes)</label>
            <input
              id="cal-reminder"
              type="number"
              min={0}
              max={240}
              value={reminder}
              onChange={(e) => setReminder(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="field">
          <label>Onde criar</label>
          <div className="chips">
            <button
              type="button"
              className="chip"
              aria-pressed={newCalendar}
              onClick={() => setNewCalendar(true)}
            >
              Agenda nova, só de inglês
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={!newCalendar}
              onClick={() => setNewCalendar(false)}
            >
              Minha agenda principal
            </button>
          </div>
        </div>

        {newCalendar && (
          <div className="field">
            <label htmlFor="cal-name">Nome da agenda</label>
            <input
              id="cal-name"
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
            />
          </div>
        )}

        <div className="tip">
          <b>Vai criar: </b>
          {totalEventos} evento{totalEventos === 1 ? "" : "s"} (semanas {fromWeek} a {toWeek}), de{" "}
          {time} em diante, no fuso de São Paulo.
        </div>

        {result && <p className="saved">{result}</p>}
        {error && (
          <p className="tip" style={{ background: "var(--warn-soft)" }}>
            <b>Não deu certo: </b>
            {error}
          </p>
        )}

        <div className="fc-actions">
          <button className="btn" onClick={onClose}>
            {result ? "Fechar" : "Cancelar"}
          </button>
          <button className="btn primary" onClick={exportar} disabled={running || totalEventos === 0}>
            {running ? "Criando eventos…" : result ? "Exportar de novo" : "Criar eventos"}
          </button>
        </div>
      </div>
    </div>
  );
}
