import { NextResponse } from "next/server";
import { allowedUser } from "@/lib/access";
import { authConfigured } from "@/lib/auth";
import { googleAccessToken, recordCalendarExport } from "@/lib/server-data";
import type { Day, RawWeek } from "@/lib/weeks";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Body = {
  weeks?: RawWeek[];
  planId?: string;
  startDate?: string;
  time?: string;
  reminderMinutes?: number;
  newCalendar?: boolean;
  calendarName?: string;
  fromWeek?: number;
  toWeek?: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

function diaDoEvento(inicio: string, semanaIndex: number, diaIndex: number): Date {
  const [ano, mes, dia] = inicio.split("-").map(Number);
  const d = new Date(ano, (mes ?? 1) - 1, dia ?? 1);
  d.setDate(d.getDate() + semanaIndex * 7 + diaIndex);
  return d;
}

function descricao(semana: RawWeek, dia: Day): string {
  const tarefas = dia.tasks
    .map((t, i) => `${i + 1}. ${t.what}\n   Recurso: ${t.resource}${t.min ? ` · ${t.min} min` : ""}`)
    .join("\n");
  const partes = [
    `Semana ${semana.n}: ${semana.theme}${semana.subtitle ? ` — ${semana.subtitle}` : ""}`,
    `Gramática da semana: ${semana.grammar.topic}`,
    "",
    tarefas,
  ];
  if (dia.speak) partes.push("", `Frase do dia: ${dia.speak}`);
  if (dia.mini) partes.push("", `Dia cansado: ${dia.mini}`);
  if (semana.milestone) partes.push("", `Meta da semana: ${semana.milestone}`);
  return partes.join("\n");
}

async function googleFetch(token: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "O Google recusou o acesso à agenda. Saia da conta e entre de novo autorizando o Google Agenda.",
      );
    }
    throw new Error(`Google Agenda respondeu ${res.status}. ${detalhe.slice(0, 160)}`);
  }
  return res.json();
}

export async function POST(request: Request) {
  if (!authConfigured) {
    return NextResponse.json({ error: "Login não configurado neste site." }, { status: 400 });
  }
  const user = await allowedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Entre com uma conta autorizada." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const semanas = (body.weeks ?? []).filter(
    (w) => w.n >= (body.fromWeek ?? 1) && w.n <= (body.toWeek ?? 99),
  );
  if (!semanas.length) {
    return NextResponse.json({ error: "Nenhuma semana para exportar." }, { status: 400 });
  }

  const inicio = body.startDate ?? new Date().toISOString().slice(0, 10);
  const [hora, minuto] = (body.time ?? "19:00").split(":").map(Number);
  const lembrete = Math.max(0, Math.min(240, body.reminderMinutes ?? 10));

  try {
    const token = await googleAccessToken(user.id);

    let calendarId = "primary";
    let calendarName = "Agenda principal";
    if (body.newCalendar) {
      calendarName = body.calendarName?.trim() || "Trilha de Inglês";
      const criada = (await googleFetch(
        token,
        "https://www.googleapis.com/calendar/v3/calendars",
        {
          method: "POST",
          body: JSON.stringify({ summary: calendarName, timeZone: "America/Sao_Paulo" }),
        },
      )) as { id: string };
      calendarId = criada.id;
    }

    // A primeira semana exportada começa na data escolhida; cada semana
    // seguinte começa sete dias depois, e o dia N da semana é o N-ésimo dia.
    const eventos: { semana: RawWeek; dia: Day; data: Date }[] = [];
    semanas.forEach((semana, si) => {
      semana.days.forEach((dia, di) => {
        eventos.push({ semana, dia, data: diaDoEvento(inicio, si, di) });
      });
    });

    let criados = 0;
    const falhas: string[] = [];
    const lote = 6;
    for (let i = 0; i < eventos.length; i += lote) {
      const fatia = eventos.slice(i, i + lote);
      const resultados = await Promise.allSettled(
        fatia.map(({ semana, dia, data }) => {
          const inicioEvento = new Date(data);
          inicioEvento.setHours(hora ?? 19, minuto ?? 0, 0, 0);
          const fimEvento = new Date(inicioEvento.getTime() + (dia.minutes || 25) * 60_000);
          const iso = (d: Date) =>
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
          return googleFetch(
            token,
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            {
              method: "POST",
              body: JSON.stringify({
                summary: `Inglês · Semana ${semana.n} · ${dia.focus}`,
                description: descricao(semana, dia),
                start: { dateTime: iso(inicioEvento), timeZone: "America/Sao_Paulo" },
                end: { dateTime: iso(fimEvento), timeZone: "America/Sao_Paulo" },
                reminders: {
                  useDefault: false,
                  overrides: [{ method: "popup", minutes: lembrete }],
                },
                source: { title: "Trilha de Inglês", url: "https://english-roadmap-qa.vercel.app" },
              }),
            },
          );
        }),
      );
      for (const r of resultados) {
        if (r.status === "fulfilled") criados++;
        else falhas.push(r.reason instanceof Error ? r.reason.message : "falha");
      }
      if (falhas.length > 5) break;
    }

    if (criados === 0) {
      return NextResponse.json(
        { error: falhas[0] ?? "Nenhum evento foi criado." },
        { status: 502 },
      );
    }

    await recordCalendarExport({
      userId: user.id,
      planId: body.planId ?? "sample",
      calendarId,
      calendarName,
      eventCount: criados,
      startDate: inicio,
    }).catch(() => {});

    return NextResponse.json({
      created: criados,
      failed: falhas.length,
      calendarName,
      calendarId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao exportar.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
