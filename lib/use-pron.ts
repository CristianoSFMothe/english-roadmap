"use client";

import { useEffect, useSyncExternalStore } from "react";
import { PRON_MAX_TEXTS, pronBatches, splitGeneratable } from "./pron-prompt";
import { pronKey, pronounce } from "./pronunciation";
import { readStored, writeStored } from "./storage";

/**
 * Pronúncia aproximada no navegador.
 * Ordem: a explícita/dicionário/semente (`pronounce`), o cache local e a tabela
 * compartilhada (`/api/pron` sem gerar, de graça). O Gemini só é chamado no clique
 * de "Gerar pronúncia" (`generatePron`).
 */
export type PronStatus = "ready" | "checking" | "missing" | "generating" | "failed";

const CACHE_KEY = "pronCache";
const CHECK_DELAY = 300;

let cache: Map<string, string> | null = null;
const status = new Map<string, Exclude<PronStatus, "ready">>();
const pending = new Map<string, string>();
const listeners = new Set<() => void>();
// Começa em 1: na hidratação o React usa o 0 do servidor e depois troca por este valor.
let version = 1;
let timer: ReturnType<typeof setTimeout> | null = null;

function getCache(): Map<string, string> {
  if (!cache) cache = new Map(Object.entries(readStored<Record<string, string>>(CACHE_KEY, {})));
  return cache;
}

function notify() {
  version += 1;
  listeners.forEach((l) => l());
}

function remember(map: Record<string, string>) {
  const c = getCache();
  for (const [k, v] of Object.entries(map)) if (v) c.set(k, v);
  writeStored(CACHE_KEY, Object.fromEntries(c));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function post(texts: string[], generate: boolean): Promise<Record<string, string>> {
  const res = await fetch("/api/pron", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      texts,
      generate,
      apiKey: generate ? readStored("geminiApiKey", "") || undefined : undefined,
      accessCode: generate ? readStored("accessCode", "") || undefined : undefined,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { say?: Record<string, string> };
  return data.say ?? {};
}

async function flush() {
  timer = null;
  const texts = [...pending.values()];
  pending.clear();
  for (const batch of pronBatches(texts, pronKey, PRON_MAX_TEXTS)) {
    let found: Record<string, string> = {};
    try {
      found = await post(batch, false);
    } catch {
      /* sem rede ou sem servidor: fica como "sem pronúncia", com o botão */
    }
    remember(found);
    for (const t of batch) {
      const k = pronKey(t);
      if (found[k]) status.delete(k);
      else if (status.get(k) === "checking") status.set(k, "missing");
    }
    notify();
  }
}

/** Põe o texto na fila de consulta à tabela compartilhada (uma vez por texto). */
function enqueue(text: string) {
  const k = pronKey(text);
  if (!k || getCache().has(k) || status.has(k)) return;
  status.set(k, "checking");
  pending.set(k, text);
  if (!timer) timer = setTimeout(flush, CHECK_DELAY);
}

function lookup(en: string, explicit?: string): { say?: string; status: PronStatus } {
  const own = pronounce(en, explicit);
  if (own) return { say: own, status: "ready" };
  const k = pronKey(en);
  const cached = getCache().get(k);
  if (cached) return { say: cached, status: "ready" };
  return { status: status.get(k) ?? "checking" };
}

/** Gera (Gemini) a pronúncia dos textos, em lotes de 40, e guarda no cache. */
export async function generatePron(texts: string[]): Promise<Record<string, string>> {
  const { ok: todo, skipped } = splitGeneratable(
    texts.filter((t) => !lookup(t).say),
    pronKey,
  );
  const out: Record<string, string> = {};
  // Longo demais para a rota: falha na hora, em vez de ficar "Gerando…" para sempre.
  for (const t of skipped) status.set(pronKey(t), "failed");
  for (const t of todo) status.set(pronKey(t), "generating");
  notify();
  for (const batch of pronBatches(todo, pronKey, PRON_MAX_TEXTS)) {
    let found: Record<string, string> = {};
    try {
      found = await post(batch, true);
    } catch {
      /* cai em "failed" abaixo */
    }
    remember(found);
    Object.assign(out, found);
    for (const t of batch) {
      const k = pronKey(t);
      if (found[k]) status.delete(k);
      else status.set(k, "failed");
    }
    notify();
  }
  return out;
}

/** Pronúncia já conhecida (dicionário, semente ou cache), sem consultar nada. */
export function knownPron(en: string, explicit?: string): string | undefined {
  return lookup(en, explicit).say;
}

/** Re-renderiza quando qualquer pronúncia muda. No servidor e na hidratação, fica em 0. */
function usePronVersion() {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}

export function usePron(en: string, explicit?: string) {
  const v = usePronVersion();
  const own = pronounce(en, explicit);
  useEffect(() => {
    if (!own && en.trim()) enqueue(en);
  }, [en, own]);
  // Antes da montagem (v = 0 e sem cache lido), só o que é igual no servidor e no cliente.
  const state = v === 0 && !own ? { status: "checking" as PronStatus } : lookup(en, explicit);
  return { ...state, generate: () => generatePron([en]).then(() => undefined) };
}

/** Para listas: quantos textos ainda estão sem pronúncia depois da consulta. */
export function useMissingPron(texts: string[]) {
  const v = usePronVersion();
  const key = texts.join("\u0001");
  useEffect(() => {
    for (const t of texts) if (!pronounce(t) && t.trim()) enqueue(t);
    // texts muda de identidade a cada render; a chave é o conteúdo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (v === 0) return { missing: [] as string[], generating: false, failed: false };
  const states = texts.map((t) => ({ t, s: lookup(t) }));
  return {
    missing: states.filter((x) => x.s.status === "missing" || x.s.status === "failed").map((x) => x.t),
    generating: states.some((x) => x.s.status === "generating"),
    failed: states.some((x) => x.s.status === "failed"),
  };
}
