import { NextResponse } from "next/server";
import { allowedUser } from "@/lib/access";
import { authConfigured } from "@/lib/auth";
import { pool } from "@/lib/db";
import { googleAccessToken } from "@/lib/server-data";
import { TOTAL_QUESTOES } from "@/lib/lesson-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.BETTER_AUTH_URL || "https://english-rodmap.vercel.app";

type Body = { time?: string; minutesBefore?: number; remove?: boolean };

type Guardado = { calendar_id: string; event_id: string; reminder_time: string };

async function lembreteSalvo(userId: string): Promise<Guardado | null> {
  const { rows } = await pool.query<Guardado>(
    "select calendar_id, event_id, reminder_time from app_reminder where user_id = $1",
    [userId],
  );
  return rows[0] ?? null;
}

async function google(token: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "O Google recusou o acesso à agenda. Saia da conta e entre de novo autorizando o Google Agenda.",
      );
    }
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Google Agenda respondeu ${res.status}. ${detalhe.slice(0, 160)}`);
  }
  if (res.status === 204) return {};
  return res.json();
}

/** Diz se já existe um lembrete diário e a que horas. */
export async function GET() {
  const user = await allowedUser();
  if (!user) return NextResponse.json({ ativo: false });
  try {
    const salvo = await lembreteSalvo(user.id);
    return NextResponse.json({ ativo: Boolean(salvo), hora: salvo?.reminder_time ?? "19:00" });
  } catch {
    return NextResponse.json({ ativo: false });
  }
}

/**
 * Cria (ou reagenda) um evento diário que se repete para sempre, lembrando de
 * fazer as lições. Como é um evento só com RRULE, remarcar é atualizar o mesmo.
 */
export async function POST(request: Request) {
  if (!authConfigured) {
    return NextResponse.json({ error: "Login não configurado neste site." }, { status: 400 });
  }
  const user = await allowedUser();
  if (!user) return NextResponse.json({ error: "Entre com uma conta autorizada." }, { status: 401 });

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const hora = /^\d{2}:\d{2}$/.test(body.time ?? "") ? (body.time as string) : "19:00";
  const antes = Math.max(0, Math.min(240, body.minutesBefore ?? 10));

  try {
    const token = await googleAccessToken(user.id);
    const salvo = await lembreteSalvo(user.id);

    if (body.remove) {
      if (salvo) {
        await google(
          token,
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(salvo.calendar_id)}/events/${encodeURIComponent(salvo.event_id)}`,
          { method: "DELETE" },
        ).catch(() => null);
        await pool.query("delete from app_reminder where user_id = $1", [user.id]);
      }
      return NextResponse.json({ ativo: false });
    }

    const hoje = new Date();
    const inicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}T${hora}:00`;
    const [h, m] = hora.split(":").map(Number);
    const fimData = new Date(hoje);
    fimData.setHours(h, (m ?? 0) + 20, 0, 0);
    const fim = `${fimData.getFullYear()}-${String(fimData.getMonth() + 1).padStart(2, "0")}-${String(fimData.getDate()).padStart(2, "0")}T${String(fimData.getHours()).padStart(2, "0")}:${String(fimData.getMinutes()).padStart(2, "0")}:00`;

    const evento = {
      summary: "Inglês · lição do dia",
      description: [
        `Suas ${TOTAL_QUESTOES} lições de hoje: 2 fáceis, 2 médias e 1 difícil.`,
        "São perguntas para responder escrevendo em inglês, com correção na hora.",
        "O que não for feito fica acumulado para os próximos dias.",
        "",
        APP_URL,
      ].join("\n"),
      start: { dateTime: inicio, timeZone: "America/Sao_Paulo" },
      end: { dateTime: fim, timeZone: "America/Sao_Paulo" },
      recurrence: ["RRULE:FREQ=DAILY"],
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: antes }] },
      source: { title: "Trilha de Inglês", url: APP_URL },
    };

    let eventId = salvo?.event_id ?? "";
    let calendarId = salvo?.calendar_id ?? "primary";

    if (eventId) {
      const atualizado = (await google(
        token,
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: "PATCH", body: JSON.stringify(evento) },
      )) as { id?: string } | null;
      if (!atualizado) eventId = ""; // foi apagado na agenda: cria de novo
    }

    if (!eventId) {
      calendarId = "primary";
      const criado = (await google(
        token,
        `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
        { method: "POST", body: JSON.stringify(evento) },
      )) as { id: string };
      eventId = criado.id;
    }

    await pool.query(
      `insert into app_reminder (user_id, calendar_id, event_id, reminder_time, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (user_id) do update set
         calendar_id = excluded.calendar_id, event_id = excluded.event_id,
         reminder_time = excluded.reminder_time, updated_at = now()`,
      [user.id, calendarId, eventId, hora],
    );

    return NextResponse.json({ ativo: true, hora });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar o lembrete.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
