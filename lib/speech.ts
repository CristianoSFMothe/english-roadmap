"use client";

/**
 * Pronúncia em inglês sem custo, em três camadas:
 * 1. palavra solta: gravação de pessoa real e IPA do Wikcionário (Wikimedia);
 * 2. voz do sistema pelo navegador (Web Speech API), quando houver voz em inglês;
 * 3. voz de IA Kokoro rodando no próprio navegador, para quem não tem voz
 *    instalada, como o Chrome no Linux. Com placa de vídeo (WebGPU) baixa ~300 MB
 *    e gera uma frase em 1 a 2 s; só com o processador baixa ~90 MB e leva 4 a 6 s.
 */

export type Speed = "normal" | "devagar";
export type Engine = "auto" | "sistema" | "ia";
export type SpeechPrefs = { speed: Speed; engine: Engine; voice?: string };

export const DEFAULT_PREFS: SpeechPrefs = { speed: "normal", engine: "auto" };
const PREFS_KEY = "english-roadmap:speechPrefs";

export function readPrefs(): SpeechPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<SpeechPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(prefs: SpeechPrefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}

/* ---------- voz do sistema ---------- */

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/** As vozes chegam de forma assíncrona no Chrome; espera até 1,5 s por elas. */
export function systemVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve([]);
  voicesPromise ??= new Promise((resolve) => {
    const now = window.speechSynthesis.getVoices();
    if (now.length) return resolve(now);
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
  return voicesPromise;
}

/** Vozes em inglês, das mais naturais para as mais robóticas. */
export async function englishVoices(): Promise<SpeechSynthesisVoice[]> {
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|online/i.test(v.name) ? 40 : 0) +
    (/google/i.test(v.name) ? 30 : 0) +
    (/samantha|aria|jenny|guy|ava|allison/i.test(v.name) ? 20 : 0) +
    (v.lang === "en-US" ? 10 : v.lang.startsWith("en-GB") ? 5 : 0) -
    (/espeak/i.test(v.name) ? 30 : 0);
  return (await systemVoices())
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => score(b) - score(a));
}

function speakSystem(text: string, voice: SpeechSynthesisVoice, slow: boolean) {
  return new Promise<void>((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = slow ? 0.65 : 0.95;
    u.onend = () => resolve();
    u.onerror = (e) => reject(new Error(e.error));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

/* ---------- Wikcionário: IPA e gravações ---------- */

export type WordInfo = { ipa?: string; audio?: string };
const wordCache = new Map<string, Promise<WordInfo>>();

/** Só palavras soltas, com letras, apóstrofo ou hífen: é o que o Wikcionário tem gravado. */
export function isSingleWord(text: string) {
  return /^[A-Za-z][A-Za-z'-]{1,}$/.test(text.trim());
}

export function lookupWord(word: string): Promise<WordInfo> {
  const key = word.trim().toLowerCase();
  if (!wordCache.has(key)) {
    wordCache.set(
      key,
      (async () => {
        const url =
          "https://en.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&origin=*&page=" +
          encodeURIComponent(key);
        const res = await fetch(url);
        if (!res.ok) return {};
        const data = (await res.json()) as { parse?: { wikitext?: string } };
        const text = data.parse?.wikitext ?? "";
        const start = text.indexOf("==English==");
        if (start < 0) return {};
        const rest = text.slice(start + 11);
        const end = rest.search(/\n==[^=]/);
        const english = end < 0 ? rest : rest.slice(0, end);

        const ipas = [...english.matchAll(/\{\{IPA\|en\|([^|}]+)/g)].map((m) => m[1]);
        const ipa = ipas.find((i) => i.startsWith("/")) ?? ipas[0];

        const files = [...english.matchAll(/\{\{audio\|en\|([^|}]+)(?:\|[^}]*)?\}\}/g)].map((m) => ({
          file: m[1].trim(),
          us: /a=[^}|]*US|en-us-/i.test(m[0]),
        }));
        const file = (files.find((f) => f.us) ?? files[0])?.file;
        return {
          ipa,
          audio: file
            ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`
            : undefined,
        };
      })().catch(() => ({})),
    );
  }
  return wordCache.get(key)!;
}

let current: HTMLAudioElement | null = null;

function playUrl(url: string, slow: boolean) {
  return new Promise<void>((resolve, reject) => {
    current?.pause();
    const audio = new Audio(url);
    audio.playbackRate = slow ? 0.75 : 1;
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("áudio indisponível"));
    current = audio;
    audio.play().catch(reject);
  });
}

/* ---------- Kokoro: voz de IA no navegador ---------- */

type KokoroAudio = { toBlob(): Blob };
type Kokoro = { generate(text: string, opts: { voice: string }): Promise<KokoroAudio> };
let kokoro: Promise<Kokoro> | null = null;
let kokoroReady = false;

export function aiVoiceLoaded() {
  return kokoroReady;
}

/** Baixa o modelo na primeira vez; o navegador guarda em cache para as próximas. */
export function loadAiVoice(): Promise<Kokoro> {
  kokoro ??= (async () => {
    const url = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";
    const mod = (await import(/* webpackIgnore: true */ url)) as {
      KokoroTTS: {
        from_pretrained(id: string, o: { dtype: string; device: string }): Promise<Kokoro>;
      };
    };
    const id = "onnx-community/Kokoro-82M-v1.0-ONNX";
    let tts: Kokoro;
    try {
      if (!("gpu" in navigator)) throw new Error("sem WebGPU");
      tts = await mod.KokoroTTS.from_pretrained(id, { dtype: "fp32", device: "webgpu" });
    } catch {
      tts = await mod.KokoroTTS.from_pretrained(id, { dtype: "q8", device: "wasm" });
    }
    kokoroReady = true;
    return tts;
  })();
  kokoro.catch(() => {
    kokoro = null;
  });
  return kokoro;
}

const aiCache = new Map<string, string>();

async function speakAi(text: string, slow: boolean) {
  let url = aiCache.get(text);
  if (!url) {
    const tts = await loadAiVoice();
    const audio = await tts.generate(text, { voice: "af_heart" });
    url = URL.createObjectURL(audio.toBlob());
    aiCache.set(text, url);
  }
  await playUrl(url, slow);
}

/* ---------- entrada única ---------- */

export type SpeakResult = { via: "gravação" | "sistema" | "ia"; ipa?: string };

/**
 * Fala o texto em inglês. `say` permite trocar o que é falado (ex.: a letra "A"
 * vira "ay"), sem mudar o que aparece na tela.
 */
export async function speak(text: string, opts: { say?: string; slow?: boolean } = {}) {
  const prefs = readPrefs();
  const slow = opts.slow ?? prefs.speed === "devagar";
  const spoken = (opts.say ?? text).replace(/ · /g, ", ").replace(/\s*\/\s*/g, ", ");

  if (!opts.say && isSingleWord(text)) {
    const info = await lookupWord(text);
    if (info.audio) {
      try {
        await playUrl(info.audio, slow);
        return { via: "gravação", ipa: info.ipa } satisfies SpeakResult;
      } catch {
        /* gravação falhou: segue para a voz sintetizada */
      }
    }
    if (prefs.engine !== "ia") {
      const voice = await chooseVoice(prefs);
      if (voice) {
        await speakSystem(spoken, voice, slow);
        return { via: "sistema", ipa: info.ipa } satisfies SpeakResult;
      }
    }
    await speakAi(spoken, slow);
    return { via: "ia", ipa: info.ipa } satisfies SpeakResult;
  }

  if (prefs.engine !== "ia") {
    const voice = await chooseVoice(prefs);
    if (voice) {
      await speakSystem(spoken, voice, slow);
      return { via: "sistema" } satisfies SpeakResult;
    }
  }
  await speakAi(spoken, slow);
  return { via: "ia" } satisfies SpeakResult;
}

async function chooseVoice(prefs: SpeechPrefs) {
  if (prefs.engine === "ia") return null;
  const voices = await englishVoices();
  return voices.find((v) => v.name === prefs.voice) ?? voices[0] ?? null;
}

/* ---------- reconhecimento: a pessoa fala e o app confere ---------- */

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onresult: ((e: { results: { 0: { transcript: string } }[][] }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type LocalState = "available" | "downloadable" | "downloading" | "unavailable";
type RecognitionCtor = {
  new (): Recognition;
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<LocalState>;
  install?: (o: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
};

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, RecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LOCAL = { langs: ["en-US"], processLocally: true };

/**
 * Reconhecimento no próprio computador (Chrome recente). Não depende do serviço
 * do Google, que costuma falhar com erro de rede no Chrome para Linux, e o áudio
 * não sai da máquina. "unavailable" quando o navegador não oferece.
 */
export async function localRecognition(): Promise<LocalState> {
  const Ctor = recognitionCtor();
  if (!Ctor?.available) return "unavailable";
  try {
    return await Ctor.available(LOCAL);
  } catch {
    return "unavailable";
  }
}

/** Pede ao Chrome o pacote de inglês offline. Precisa vir de um clique. */
export async function installLocalRecognition(): Promise<boolean> {
  const Ctor = recognitionCtor();
  if (!Ctor?.install) return false;
  try {
    return await Ctor.install(LOCAL);
  } catch {
    return false;
  }
}

const normalize = (t: string) =>
  t
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function recognizeOnce(Ctor: RecognitionCtor, local: boolean): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = false;
    r.maxAlternatives = 3;
    if (local) r.processLocally = true;
    let got: string[] = [];
    let failed = false;
    r.onresult = (e) => {
      got = Array.from(e.results[0] as unknown as ArrayLike<{ transcript: string }>).map(
        (a) => a.transcript,
      );
    };
    r.onerror = (e) => {
      failed = true;
      reject(Object.assign(new Error(e.error), { code: e.error }));
    };
    r.onend = () => {
      if (!failed) resolve(got);
    };
    r.start();
  });
}

const MENSAGENS: Record<string, string> = {
  "not-allowed": "O microfone está bloqueado. Libere em Preferências.",
  "service-not-allowed": "O microfone está bloqueado. Libere em Preferências.",
  "no-speech": "Não ouvi nada. Tente de novo, mais perto do microfone.",
  "audio-capture": "Nenhum microfone encontrado.",
  "language-not-supported": "O reconhecimento de inglês não está disponível neste navegador.",
};

/* ---------- Whisper: reconhecimento no navegador, sem serviço externo ---------- */

type Transcriber = (audio: Float32Array) => Promise<{ text: string }>;
let whisper: Promise<Transcriber> | null = null;
let whisperReady = false;

export function whisperLoaded() {
  return whisperReady;
}

/**
 * Baixa o modelo na primeira vez; depois ele fica no cache do navegador. Com placa
 * de vídeo (WebGPU) transcreve uma frase em 1 a 2 s; só com o processador, em ~4 s.
 */
export function loadWhisper(): Promise<Transcriber> {
  whisper ??= (async () => {
    const url = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
    const mod = (await import(/* webpackIgnore: true */ url)) as {
      pipeline(
        task: string,
        model: string,
        o: { dtype: string | Record<string, string>; device: string },
      ): Promise<Transcriber>;
    };
    const id = "onnx-community/whisper-base.en";
    let t: Transcriber;
    try {
      if (!("gpu" in navigator)) throw new Error("sem WebGPU");
      t = await mod.pipeline("automatic-speech-recognition", id, {
        dtype: { encoder_model: "fp32", decoder_model_merged: "q4" },
        device: "webgpu",
      });
    } catch {
      t = await mod.pipeline("automatic-speech-recognition", id, { dtype: "q8", device: "wasm" });
    }
    whisperReady = true;
    return t;
  })();
  whisper.catch(() => {
    whisper = null;
  });
  return whisper;
}

/**
 * Grava até a pessoa parar de falar: começa a contar quando detecta voz e para
 * depois de 1,2 s de silêncio, ou em 7 s no máximo.
 */
async function recordUtterance(): Promise<Float32Array> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    throw Object.assign(new Error(name), {
      code: name === "NotFoundError" ? "audio-capture" : "not-allowed",
    });
  }
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);

  const heard = await new Promise<boolean>((resolve) => {
    const data = new Uint8Array(analyser.fftSize);
    const inicio = performance.now();
    let falou = false;
    let ultimaVoz = inicio;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let pico = 0;
      for (const v of data) pico = Math.max(pico, Math.abs(v - 128));
      const agora = performance.now();
      if (pico > 12) {
        falou = true;
        ultimaVoz = agora;
      }
      if ((falou && agora - ultimaVoz > 1200) || agora - inicio > 7000 || (!falou && agora - inicio > 5000)) {
        return resolve(falou);
      }
      requestAnimationFrame(tick);
    };
    recorder.start();
    tick();
  });

  const blob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
    recorder.stop();
  });
  stream.getTracks().forEach((t) => t.stop());
  await ctx.close().catch(() => {});
  if (!heard) throw Object.assign(new Error("no-speech"), { code: "no-speech" });

  // O Whisper espera áudio mono a 16 kHz.
  const decoder = new AudioContext({ sampleRate: 16000 });
  const audio = await decoder.decodeAudioData(await blob.arrayBuffer());
  await decoder.close().catch(() => {});
  return audio.getChannelData(0);
}

async function transcribeInBrowser(onStatus?: (s: ListenStatus) => void): Promise<string[]> {
  const ready = whisperLoaded();
  const modelo = loadWhisper();
  if (!ready) onStatus?.("carregando");
  const transcriber = await modelo;
  onStatus?.("ouvindo");
  const audio = await recordUtterance();
  onStatus?.("transcrevendo");
  const { text } = await transcriber(audio);
  const limpo = text.replace(/\[[^\]]*\]|\([^)]*\)/g, "").trim();
  return limpo ? [limpo] : [];
}

/* ---------- entrada única do reconhecimento ---------- */

export type ListenStatus = "carregando" | "ouvindo" | "transcrevendo";

// Se o serviço do Google falhou nesta visita, as próximas vão direto para o Whisper.
let cloudBroken = false;

/** Ouve uma fala em inglês e devolve as transcrições possíveis. */
export async function listen(onStatus?: (s: ListenStatus) => void): Promise<string[]> {
  const Ctor = recognitionCtor();
  const podeGravar = typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices);

  try {
    const local = Ctor ? await localRecognition() : "unavailable";
    if (local === "downloadable") void installLocalRecognition();

    if (Ctor && (local === "available" || !cloudBroken)) {
      try {
        onStatus?.("ouvindo");
        return await recognizeOnce(Ctor, local === "available");
      } catch (e) {
        const code = (e as { code?: string }).code ?? "";
        if (!(code === "network" || code === "service-not-allowed") || !podeGravar) throw e;
        cloudBroken = true;
      }
    }
    if (!podeGravar) throw new Error("Este navegador não reconhece fala. Use o Chrome ou o Edge.");
    return await transcribeInBrowser(onStatus);
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "network")
      throw new Error("O serviço de voz do Google não respondeu. Tente de novo em instantes.");
    if (code) throw new Error(MENSAGENS[code] ?? `Falha no reconhecimento (${code}).`);
    throw e instanceof Error && e.message
      ? new Error(`Não foi possível reconhecer a fala: ${e.message}`)
      : new Error("Não foi possível reconhecer a fala.");
  }
}

/** Compara o que foi dito com o esperado, palavra por palavra (0 a 1). */
export function similarity(said: string, expected: string): number {
  const a = normalize(said).split(" ").filter(Boolean);
  const b = normalize(expected.split(/ · | \/ /)[0]).split(" ").filter(Boolean);
  if (!b.length) return 0;
  const pool = [...a];
  let hits = 0;
  for (const word of b) {
    const i = pool.indexOf(word);
    if (i >= 0) {
      hits++;
      pool.splice(i, 1);
    }
  }
  return hits / Math.max(b.length, a.length || 1);
}
