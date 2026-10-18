import { pool } from "./db";
import type { RawWeek } from "./weeks";
import type { Profile } from "./profile";

export type StoredPlan = {
  id: string;
  createdAt: number;
  profile: Profile;
  weeks: RawWeek[];
};

export type StoredProgress = {
  done: Record<string, boolean>;
  known: Record<string, boolean>;
  notes: Record<string, string>;
  currentWeek: number;
};

export type UserData = {
  profile: Profile | null;
  plan: StoredPlan | null;
  progress: Record<string, StoredProgress>;
};

export async function loadUserData(userId: string): Promise<UserData> {
  const [perfil, plano, progresso] = await Promise.all([
    pool.query<{ data: Profile }>("select data from app_profile where user_id = $1", [userId]),
    pool.query<{ id: string; created_at: Date; profile: Profile; weeks: RawWeek[] }>(
      "select id, created_at, profile, weeks from app_plan where user_id = $1 and is_active order by created_at desc limit 1",
      [userId],
    ),
    pool.query<{
      plan_id: string;
      done: Record<string, boolean>;
      known: Record<string, boolean>;
      notes: Record<string, string>;
      current_week: number;
    }>(
      "select plan_id, done, known, notes, current_week from app_progress where user_id = $1",
      [userId],
    ),
  ]);

  const progress: Record<string, StoredProgress> = {};
  for (const row of progresso.rows) {
    progress[row.plan_id] = {
      done: row.done ?? {},
      known: row.known ?? {},
      notes: row.notes ?? {},
      currentWeek: row.current_week ?? 1,
    };
  }

  const p = plano.rows[0];
  return {
    profile: perfil.rows[0]?.data ?? null,
    plan: p
      ? { id: p.id, createdAt: new Date(p.created_at).getTime(), profile: p.profile, weeks: p.weeks }
      : null,
    progress,
  };
}

export async function saveProfile(userId: string, profile: Profile) {
  await pool.query(
    `insert into app_profile (user_id, data, updated_at) values ($1, $2, now())
     on conflict (user_id) do update set data = excluded.data, updated_at = now()`,
    [userId, JSON.stringify(profile)],
  );
}

export async function savePlan(userId: string, plan: StoredPlan) {
  await pool.query("update app_plan set is_active = false where user_id = $1 and id <> $2", [
    userId,
    plan.id,
  ]);
  await pool.query(
    `insert into app_plan (id, user_id, created_at, profile, weeks, is_active)
     values ($1, $2, to_timestamp($3 / 1000.0), $4, $5, true)
     on conflict (id) do update set profile = excluded.profile, weeks = excluded.weeks, is_active = true`,
    [plan.id, userId, plan.createdAt, JSON.stringify(plan.profile), JSON.stringify(plan.weeks)],
  );
}

export async function clearActivePlan(userId: string) {
  await pool.query("update app_plan set is_active = false where user_id = $1", [userId]);
}

export async function saveProgress(userId: string, planId: string, progress: StoredProgress) {
  await pool.query(
    `insert into app_progress (user_id, plan_id, done, known, notes, current_week, updated_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (user_id, plan_id) do update set
       done = excluded.done, known = excluded.known, notes = excluded.notes,
       current_week = excluded.current_week, updated_at = now()`,
    [
      userId,
      planId,
      JSON.stringify(progress.done ?? {}),
      JSON.stringify(progress.known ?? {}),
      JSON.stringify(progress.notes ?? {}),
      progress.currentWeek ?? 1,
    ],
  );
}

export async function recordCalendarExport(args: {
  userId: string;
  planId: string;
  calendarId: string;
  calendarName: string;
  eventCount: number;
  startDate: string;
}) {
  await pool.query(
    `insert into app_calendar_export (id, user_id, plan_id, calendar_id, calendar_name, event_count, start_date)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      `exp-${Date.now()}`,
      args.userId,
      args.planId,
      args.calendarId,
      args.calendarName,
      args.eventCount,
      args.startDate,
    ],
  );
}

/** Token do Google guardado pelo Better Auth, renovado quando já expirou. */
export async function googleAccessToken(userId: string): Promise<string> {
  const { rows } = await pool.query<{
    accessToken: string | null;
    refreshToken: string | null;
    accessTokenExpiresAt: Date | null;
    scope: string | null;
  }>(
    `select "accessToken", "refreshToken", "accessTokenExpiresAt", "scope"
     from "account" where "userId" = $1 and "providerId" = 'google' limit 1`,
    [userId],
  );

  const conta = rows[0];
  if (!conta) throw new Error("Nenhuma conta Google conectada.");

  const margem = 60_000;
  const valido =
    conta.accessToken &&
    conta.accessTokenExpiresAt &&
    new Date(conta.accessTokenExpiresAt).getTime() - margem > Date.now();
  if (valido) return conta.accessToken as string;

  if (!conta.refreshToken) {
    throw new Error(
      "O Google não devolveu um refresh token. Saia da conta e entre de novo para reautorizar o acesso à agenda.",
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: conta.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error("Não foi possível renovar o acesso ao Google. Entre na conta de novo.");
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  await pool.query(
    `update "account" set "accessToken" = $1, "accessTokenExpiresAt" = $2, "updatedAt" = now()
     where "userId" = $3 and "providerId" = 'google'`,
    [data.access_token, new Date(Date.now() + data.expires_in * 1000), userId],
  );
  return data.access_token;
}
