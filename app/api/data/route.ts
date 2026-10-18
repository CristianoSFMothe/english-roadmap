import { NextResponse } from "next/server";
import { allowedUser } from "@/lib/access";
import {
  clearActivePlan,
  loadUserData,
  savePlan,
  saveProfile,
  saveProgress,
  type StoredPlan,
  type StoredProgress,
} from "@/lib/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId(): Promise<string | null> {
  const user = await allowedUser();
  return user?.id ?? null;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ signedIn: false });
  try {
    const data = await loadUserData(id);
    return NextResponse.json({ signedIn: true, ...data });
  } catch {
    return NextResponse.json({ error: "Falha ao ler seus dados." }, { status: 500 });
  }
}

type Body = {
  profile?: unknown;
  plan?: StoredPlan | null;
  progress?: { planId: string; value: StoredProgress };
};

export async function PUT(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  try {
    const tarefas: Promise<unknown>[] = [];
    if (body.profile) tarefas.push(saveProfile(id, body.profile as never));
    if (body.plan === null) tarefas.push(clearActivePlan(id));
    else if (body.plan) tarefas.push(savePlan(id, body.plan));
    if (body.progress?.planId) {
      tarefas.push(saveProgress(id, body.progress.planId, body.progress.value));
    }
    await Promise.all(tarefas);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao salvar seus dados." }, { status: 500 });
  }
}
