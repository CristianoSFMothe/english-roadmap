"use client";

import { useEffect, useState } from "react";
import { aiVoiceLoaded, listen, similarity, speak, type ListenStatus } from "@/lib/speech";

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" />
      <path
        d="M11.5 5.5a3.5 3.5 0 0 1 0 5M13 3.5a6 6 0 0 1 0 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill="currentColor" />
      <path
        d="M3 7.5a5 5 0 0 0 10 0M8 12.5V15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Ouvir a pronúncia. Depois de tocar uma palavra solta, mostra a IPA ao lado. */
export function Speak({
  text,
  say,
  showIpa = true,
}: {
  text: string;
  say?: string;
  showIpa?: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [ipa, setIpa] = useState<string>();
  const [hint, setHint] = useState("Ouvir");

  const play = async () => {
    setState("busy");
    setHint(aiVoiceLoaded() ? "Gerando a voz…" : "Carregando a pronúncia…");
    try {
      const r = await speak(text, { say });
      if (r.ipa) setIpa(r.ipa);
      setState("idle");
      setHint(
        r.via === "gravação" ? "Ouvir (gravação real)" : r.via === "ia" ? "Ouvir (voz de IA)" : "Ouvir",
      );
    } catch (e) {
      setState("error");
      setHint(e instanceof Error ? `Sem áudio: ${e.message}` : "Sem áudio");
    }
  };

  return (
    <>
      {showIpa && ipa && <span className="ipa">{ipa}</span>}
      <button
        type="button"
        className={`speak ${state}`}
        aria-label={`Ouvir: ${text}`}
        title={hint}
        aria-busy={state === "busy"}
        onClick={play}
      >
        <SpeakerIcon />
      </button>
    </>
  );
}

/** Falar em voz alta e conferir se o reconhecimento entendeu o esperado. */
export function SayIt({ expected }: { expected: string }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "listening">("idle");
  const [status, setStatus] = useState<ListenStatus | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(
    () =>
      setSupported(
        "SpeechRecognition" in window ||
          "webkitSpeechRecognition" in window ||
          ("MediaRecorder" in window && Boolean(navigator.mediaDevices)),
      ),
    [],
  );
  useEffect(() => setResult(null), [expected]);
  if (!supported) return null;

  const run = async () => {
    setState("listening");
    setResult(null);
    try {
      const options = await listen(setStatus);
      if (!options.length) {
        setResult({ ok: false, text: "Não entendi. Tente de novo, falando mais devagar." });
        return;
      }
      const best = options
        .map((o) => ({ o, s: similarity(o, expected) }))
        .sort((a, b) => b.s - a.s)[0];
      setResult(
        best.s >= 0.8
          ? { ok: true, text: `Muito bem! Entendi: "${best.o}"` }
          : { ok: false, text: `Entendi: "${best.o}". Ouça de novo e repita.` },
      );
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Falha no microfone." });
    } finally {
      setState("idle");
      setStatus(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`speak mic ${state}`}
        aria-label={`Falar: ${expected}`}
        title={state === "listening" ? "Ouvindo… fale agora" : "Falar e conferir a pronúncia"}
        aria-pressed={state === "listening"}
        onClick={run}
        disabled={state === "listening"}
      >
        <MicIcon />
      </button>
      {status && (
        <span className="say-result" role="status">
          {status === "carregando"
            ? "Preparando o reconhecimento de voz (só na primeira vez)…"
            : status === "ouvindo"
              ? "Pode falar…"
              : "Conferindo…"}
        </span>
      )}
      {result && (
        <span className={`say-result ${result.ok ? "ok" : "bad"}`} role="status">
          {result.text}
        </span>
      )}
    </>
  );
}
