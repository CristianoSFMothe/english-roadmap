import { prisma } from "./db";
import type { Prisma } from "./generated/prisma/client";
import type { RawWeek } from "./weeks";
import { clampProfile, emptyProfile, type Profile } from "./profile";
import { cleanWords, type MyWord } from "./vocabulary";

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
    prisma.profile.findUnique({ where: { userId }, select: { data: true } }),
    prisma.plan.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, profile: true, weeks: true },
    }),
    prisma.progress.findMany({
      where: { userId },
      select: { planId: true, done: true, known: true, notes: true, currentWeek: true },
    }),
  ]);

  const progress: Record<string, StoredProgress> = {};
  for (const row of progresso) {
    progress[row.planId] = {
      done: (row.done as Record<string, boolean>) ?? {},
      known: (row.known as Record<string, boolean>) ?? {},
      notes: (row.notes as Record<string, string>) ?? {},
      currentWeek: row.currentWeek ?? 1,
    };
  }

  return {
    profile: (perfil?.data as Profile | undefined) ?? null,
    plan: plano
      ? {
          id: plano.id,
          createdAt: plano.createdAt.getTime(),
          profile: plano.profile as Profile,
          weeks: plano.weeks as RawWeek[],
        }
      : null,
    progress,
  };
}

/** Os JSONs do app viram `InputJsonValue` do Prisma (o formato já é JSON puro). */
const json = (v: unknown) => v as Prisma.InputJsonValue;

export async function saveProfile(userId: string, profile: Profile) {
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, data: json(profile) },
    update: { data: json(profile), updatedAt: new Date() },
  });
}

export async function savePlan(userId: string, plan: StoredPlan) {
  await prisma.$transaction([
    prisma.plan.updateMany({
      where: { userId, id: { not: plan.id } },
      data: { isActive: false },
    }),
    prisma.plan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        userId,
        createdAt: new Date(plan.createdAt),
        profile: json(plan.profile),
        weeks: json(plan.weeks),
        isActive: true,
      },
      update: { profile: json(plan.profile), weeks: json(plan.weeks), isActive: true },
    }),
  ]);
}

export async function clearActivePlan(userId: string) {
  await prisma.plan.updateMany({ where: { userId }, data: { isActive: false } });
}

export async function saveProgress(userId: string, planId: string, progress: StoredProgress) {
  const dados = {
    done: json(progress.done ?? {}),
    known: json(progress.known ?? {}),
    notes: json(progress.notes ?? {}),
    currentWeek: progress.currentWeek ?? 1,
    updatedAt: new Date(),
  };
  await prisma.progress.upsert({
    where: { userId_planId: { userId, planId } },
    create: { userId, planId, ...dados },
    update: dados,
  });
}

export async function recordCalendarExport(args: {
  userId: string;
  planId: string;
  calendarId: string;
  calendarName: string;
  eventCount: number;
  startDate: string;
}) {
  await prisma.calendarExport.create({
    data: {
      id: `exp-${Date.now()}`,
      userId: args.userId,
      planId: args.planId,
      calendarId: args.calendarId,
      calendarName: args.calendarName,
      eventCount: args.eventCount,
      // Coluna `date`: meia-noite UTC, para não virar o dia anterior no fuso de São Paulo.
      startDate: new Date(`${args.startDate}T00:00:00Z`),
    },
  });
}

/** Token do Google guardado pelo Better Auth, renovado quando já expirou. */
export async function googleAccessToken(userId: string): Promise<string> {
  const conta = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
    select: { accessToken: true, refreshToken: true, accessTokenExpiresAt: true, scope: true },
  });
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
  await prisma.account.updateMany({
    where: { userId, providerId: "google" },
    data: {
      accessToken: data.access_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      updatedAt: new Date(),
    },
  });
  return data.access_token;
}

/** Fica em lib/vocabulary.ts para o `npm test` conseguir testar sem o banco. */
export { cleanWords };

export async function loadVocab(userId: string): Promise<MyWord[] | null> {
  const r = await prisma.vocab.findUnique({ where: { userId }, select: { words: true } });
  return r ? cleanWords(r.words) : null;
}

export async function saveVocab(userId: string, words: MyWord[]) {
  await prisma.vocab.upsert({
    where: { userId },
    create: { userId, words: json(words) },
    update: { words: json(words), updatedAt: new Date() },
  });
}

/** O que a conta Google autorizou: serve para a página de preferências mostrar o estado. */
export async function googleGrant(userId: string) {
  const conta = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
    select: { scope: true, refreshToken: true },
  });
  return {
    connected: Boolean(conta),
    calendar: Boolean(conta?.scope?.includes("calendar.events")),
    offline: Boolean(conta?.refreshToken),
  };
}

/** O perfil salvo na conta, ou o enviado pelo navegador, dentro dos limites. */
export async function userProfile(userId: string, enviado?: Profile): Promise<Profile> {
  const salvo = (await loadUserData(userId)).profile;
  return clampProfile(salvo ?? enviado ?? emptyProfile);
}
