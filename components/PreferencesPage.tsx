"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { entrarComGoogle } from "@/lib/auth-client";
import {
  DEFAULT_PREFS,
  aiVoiceLoaded,
  whisperLoaded,
  englishVoices,
  installLocalRecognition,
  loadAiVoice,
  loadWhisper,
  localRecognition,
  readPrefs,
  speak,
  writePrefs,
  type SpeechPrefs,
} from "@/lib/speech";

type PermState = "granted" | "denied" | "prompt" | "unsupported" | "checking";

const LABEL: Record<PermState, string> = {
  granted: "Permitido",
  denied: "Bloqueado",
  prompt: "Ainda não pedido",
  unsupported: "Não disponível neste navegador",
  checking: "Verificando…",
};

function Status({ state }: { state: PermState }) {
  return <span className={`perm perm-${state}`}>{LABEL[state]}</span>;
}

/** Estado de uma permissão do navegador, atualizado quando a pessoa muda nas configurações. */
function usePermission(name: "microphone" | "geolocation") {
  const [state, setState] = useState<PermState>("checking");
  useEffect(() => {
    let status: PermissionStatus | null = null;
    const sync = () => status && setState(status.state as PermState);
    if (!navigator.permissions?.query) {
      setState("prompt");
      return;
    }
    navigator.permissions
      .query({ name: name as PermissionName })
      .then((s) => {
        status = s;
        sync();
        s.addEventListener("change", sync);
      })
      .catch(() => setState("prompt"));
    return () => status?.removeEventListener("change", sync);
  }, [name]);
  return [state, setState] as const;
}

function Blocked({ what }: { what: string }) {
  return (
    <p className="tip">
      <b>Está bloqueado. </b>
      Clique no ícone à esquerda do endereço do site (cadeado ou ajustes), permita o {what} e
      recarregue a página.
    </p>
  );
}

function AudioSection() {
  const [mic, setMic] = usePermission("microphone");
  const [micError, setMicError] = useState("");
  const [level, setLevel] = useState<number | null>(null);
  const stopTest = useRef<() => void>(() => {});

  const [prefs, setPrefs] = useState<SpeechPrefs>(DEFAULT_PREFS);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null);
  const [ai, setAi] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [test, setTest] = useState("");

  useEffect(() => {
    setPrefs(readPrefs());
    englishVoices().then(setVoices);
    if (aiVoiceLoaded()) setAi("ready");
    return () => stopTest.current();
  }, []);

  const update = (next: Partial<SpeechPrefs>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    writePrefs(merged);
  };

  const askMic = async () => {
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMic("granted");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError") setMic("denied");
      else setMicError(name === "NotFoundError" ? "Nenhum microfone encontrado." : "Não foi possível usar o microfone.");
    }
  };

  // Mostra o volume captado por 6 segundos, para conferir se o microfone certo está ativo.
  const testMic = async () => {
    stopTest.current();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMic("granted");
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let raf = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 64));
        raf = requestAnimationFrame(tick);
      };
      tick();
      const stop = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        ctx.close().catch(() => {});
        setLevel(null);
      };
      stopTest.current = stop;
      setTimeout(stop, 6000);
    } catch {
      setMicError("Não foi possível abrir o microfone.");
    }
  };

  const loadAi = async () => {
    setAi("loading");
    try {
      await loadAiVoice();
      setAi("ready");
    } catch {
      setAi("error");
    }
  };

  const testSpeaker = async () => {
    setTest("Tocando…");
    try {
      const r = await speak("Hello! This is how the pronunciation sounds.");
      setTest(r.via === "ia" ? "Tocou com a voz de IA." : "Tocou com a voz do sistema.");
      if (r.via === "ia") setAi("ready");
    } catch (e) {
      setTest(e instanceof Error ? `Não tocou: ${e.message}` : "Não tocou.");
    }
  };

  const semVozes = voices !== null && voices.length === 0;

  return (
    <section className="card prefs-section">
      <div className="section-title">
        <h2>Microfone e alto-falante</h2>
      </div>

      <div className="pref-row">
        <div>
          <strong>Microfone</strong>
          <p>
            Usado só quando você clica no botão de falar, para conferir a sua pronúncia. O áudio vai
            para o reconhecimento de fala do navegador e não é gravado pelo app.
          </p>
        </div>
        <div className="pref-actions">
          <Status state={mic} />
          {mic !== "granted" && mic !== "denied" && (
            <button className="btn small primary" onClick={askMic}>
              Permitir microfone
            </button>
          )}
          {mic === "granted" && (
            <button className="btn small" onClick={testMic} disabled={level !== null}>
              {level !== null ? "Fale algo…" : "Testar microfone"}
            </button>
          )}
        </div>
      </div>
      {level !== null && (
        <div className="meter" aria-label="Volume do microfone">
          <i style={{ width: `${Math.round(level * 100)}%` }} />
        </div>
      )}
      {mic === "denied" && <Blocked what="microfone" />}
      {micError && <p className="perm-error">{micError}</p>}

      <RecognitionRow />

      <div className="pref-row">
        <div>
          <strong>Alto-falante e voz</strong>
          <p>
            Palavras soltas tocam uma gravação real do Wikcionário. Frases usam a voz do sistema
            ou, se ela não existir, uma voz de IA que roda no seu navegador.
          </p>
        </div>
        <div className="pref-actions">
          <button className="btn small primary" onClick={testSpeaker}>
            Testar som
          </button>
        </div>
      </div>
      {test && <p className="perm-note">{test}</p>}

      {semVozes && (
        <p className="tip">
          <b>Seu navegador não tem vozes em inglês instaladas</b> (comum no Chrome para Linux).
          O app usa a voz de IA Kokoro, que roda no seu computador: ela é baixada uma vez e
          depois fica guardada no navegador. Com placa de vídeo compatível são cerca de 300 MB e
          cada frase sai em 1 a 2 segundos; sem ela, cerca de 90 MB e 4 a 6 segundos.
        </p>
      )}

      <div className="pref-grid">
        <div className="field">
          <label htmlFor="pf-engine">Voz das frases</label>
          <select
            id="pf-engine"
            value={prefs.engine}
            onChange={(e) => update({ engine: e.target.value as SpeechPrefs["engine"] })}
          >
            <option value="auto">Automática (sistema, ou IA se não houver)</option>
            <option value="sistema" disabled={semVozes}>
              Sempre a voz do sistema
            </option>
            <option value="ia">Sempre a voz de IA (mais natural)</option>
          </select>
        </div>

        {voices && voices.length > 0 && prefs.engine !== "ia" && (
          <div className="field">
            <label htmlFor="pf-voice">Voz do sistema</label>
            <select
              id="pf-voice"
              value={prefs.voice ?? ""}
              onChange={(e) => update({ voice: e.target.value || undefined })}
            >
              <option value="">A mais natural disponível</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="pf-speed">Velocidade</label>
          <select
            id="pf-speed"
            value={prefs.speed}
            onChange={(e) => update({ speed: e.target.value as SpeechPrefs["speed"] })}
          >
            <option value="normal">Normal</option>
            <option value="devagar">Devagar</option>
          </select>
        </div>
      </div>

      {(semVozes || prefs.engine === "ia") && (
        <div className="pref-row">
          <div>
            <strong>Voz de IA</strong>
            <p>
              {ai === "ready"
                ? "Baixada e pronta para usar."
                : ai === "loading"
                  ? "Baixando o modelo… pode levar alguns minutos na primeira vez."
                  : ai === "error"
                    ? "Não foi possível baixar. Confira a internet e tente de novo."
                    : "Baixe agora para não esperar na primeira vez que ouvir uma frase."}
            </p>
          </div>
          <div className="pref-actions">
            {ai !== "ready" && (
              <button className="btn small" onClick={loadAi} disabled={ai === "loading"}>
                {ai === "loading" ? "Baixando…" : "Baixar voz de IA"}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

const RECONHECIMENTO: Record<string, { label: string; perm: PermState; text: string }> = {
  available: {
    label: "Instalado",
    perm: "granted",
    text: "Funciona no seu computador, sem depender do serviço do Google. O áudio não sai da máquina.",
  },
  downloading: {
    label: "Baixando…",
    perm: "checking",
    text: "O Chrome está baixando o pacote de inglês. Leva alguns instantes.",
  },
  downloadable: {
    label: "Pode ser baixado",
    perm: "prompt",
    text: "Baixe o pacote de inglês do próprio Chrome para conferir a pronúncia sem depender da internet.",
  },
  unavailable: {
    label: "Usa o serviço do Google",
    perm: "prompt",
    text: "Este navegador só reconhece fala pelo serviço online do Google. No Chrome para Linux ele pode falhar com erro de rede; o Chrome atualizado ou o Edge resolvem.",
  },
};

/** Reconhecimento de fala offline do Chrome, usado pelo botão de microfone. */
function RecognitionRow() {
  const [state, setState] = useState<string>("checking");
  const [failed, setFailed] = useState(false);
  const [whisper, setWhisper] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const baixarWhisper = async () => {
    setWhisper("loading");
    try {
      await loadWhisper();
      setWhisper("ready");
    } catch {
      setWhisper("error");
    }
  };

  useEffect(() => {
    if (whisperLoaded()) setWhisper("ready");
    let parar = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      const s = await localRecognition();
      if (parar) return;
      setState(s);
      if (s === "downloading") timer = setTimeout(check, 3000);
    };
    check();
    return () => {
      parar = true;
      clearTimeout(timer);
    };
  }, []);

  const install = async () => {
    setFailed(false);
    setState("downloading");
    const ok = await installLocalRecognition();
    const s = await localRecognition();
    setState(s);
    if (!ok && s !== "available") setFailed(true);
  };

  const info = RECONHECIMENTO[state];
  return (
    <>
      <div className="pref-row">
        <div>
          <strong>Reconhecimento de fala</strong>
          <p>{info?.text ?? "Verificando o que este navegador oferece…"}</p>
        </div>
        <div className="pref-actions">
          {info ? (
            <span className={`perm perm-${info.perm}`}>{info.label}</span>
          ) : (
            <Status state="checking" />
          )}
          {state === "downloadable" && (
            <button className="btn small primary" onClick={install}>
              Baixar reconhecimento offline
            </button>
          )}
        </div>
      </div>
      {failed && (
        <p className="perm-error">O Chrome não concluiu o download. Tente de novo em instantes.</p>
      )}
      {state !== "available" && state !== "checking" && (
        <div className="pref-row">
          <div>
            <strong>Alternativa no navegador (Whisper)</strong>
            <p>
              {whisper === "ready"
                ? "Pronto. Se o serviço do Google falhar, o botão de falar usa este reconhecimento."
                : whisper === "loading"
                  ? "Baixando o modelo (80 a 150 MB, só na primeira vez; pode levar um minuto)…"
                  : whisper === "error"
                    ? "Não foi possível baixar. Confira a internet e tente de novo."
                    : "Reconhecimento de fala gratuito que roda no seu computador. É usado quando o serviço do Google falha, como no Chrome para Linux."}
            </p>
          </div>
          <div className="pref-actions">
            {whisper !== "ready" && (
              <button className="btn small" onClick={baixarWhisper} disabled={whisper === "loading"}>
                {whisper === "loading" ? "Baixando…" : "Baixar agora"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function LocationSection() {
  const [geo, setGeo] = usePermission("geolocation");
  const [where, setWhere] = useState("");
  const [zone, setZone] = useState("");

  useEffect(() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);

  const ask = () => {
    if (!navigator.geolocation) {
      setGeo("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo("granted");
        setWhere(
          `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)} (precisão de ${Math.round(pos.coords.accuracy)} m)`,
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeo("denied");
        else setWhere("Não foi possível obter a localização agora.");
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  return (
    <section className="card prefs-section">
      <div className="section-title">
        <h2>Localização</h2>
      </div>
      <div className="pref-row">
        <div>
          <strong>Acesso à localização</strong>
          <p>
            Hoje o app ainda não usa a sua localização, e ela não é enviada ao servidor. A
            permissão fica pronta para recursos futuros, como ajustar o fuso horário da agenda.
            Fuso deste aparelho: <b>{zone || "…"}</b>.
          </p>
        </div>
        <div className="pref-actions">
          <Status state={geo} />
          {geo !== "denied" && geo !== "unsupported" && (
            <button className="btn small primary" onClick={ask}>
              {geo === "granted" ? "Ver localização" : "Permitir localização"}
            </button>
          )}
        </div>
      </div>
      {where && <p className="perm-note">{where}</p>}
      {geo === "denied" && <Blocked what="acesso à localização" />}
    </section>
  );
}

type GoogleStatus = {
  enabled: boolean;
  signedIn?: boolean;
  email?: string;
  connected?: boolean;
  calendar?: boolean;
  offline?: boolean;
  error?: string;
};

function CalendarSection() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);

  useEffect(() => {
    fetch("/api/google-status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ enabled: true, error: "Sem conexão com o servidor." }));
  }, []);

  const pronto = status?.calendar && status?.offline;

  return (
    <section className="card prefs-section">
      <div className="section-title">
        <h2>Google Agenda</h2>
      </div>
      <div className="pref-row">
        <div>
          <strong>Acesso à agenda</strong>
          <p>
            Permite que o botão &quot;Pôr na agenda&quot; crie um evento por dia de estudo, com
            as tarefas e um lembrete. O app só cria eventos; não lê os seus outros compromissos.
          </p>
          {status?.signedIn && status.email && (
            <p className="perm-note">Conta: {status.email}</p>
          )}
        </div>
        <div className="pref-actions">
          {!status ? (
            <Status state="checking" />
          ) : status.error ? (
            <span className="perm perm-denied">{status.error}</span>
          ) : !status.enabled ? (
            <Status state="unsupported" />
          ) : !status.signedIn ? (
            <>
              <Status state="prompt" />
              <button className="btn small primary" onClick={() => entrarComGoogle()}>
                Entrar com Google
              </button>
            </>
          ) : (
            <>
              <Status state={pronto ? "granted" : "prompt"} />
              <button
                className={`btn small ${pronto ? "" : "primary"}`}
                onClick={() => entrarComGoogle()}
              >
                {pronto ? "Autorizar de novo" : "Permitir acesso à agenda"}
              </button>
            </>
          )}
        </div>
      </div>
      {status?.signedIn && !pronto && (
        <p className="tip">
          <b>Falta autorizar. </b>
          {!status.calendar
            ? "Na tela do Google, marque a opção de ver e editar eventos da agenda."
            : "O Google não deu acesso contínuo. Autorize de novo para a agenda funcionar depois que o acesso atual expirar."}
        </p>
      )}
      {status?.signedIn && (
        <p className="perm-note">
          Para remover o acesso a qualquer momento, use{" "}
          <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer">
            as conexões da sua conta Google
          </a>
          .
        </p>
      )}
      {!status?.enabled && status && !status.error && (
        <p className="perm-note">O login com Google não está configurado neste site.</p>
      )}
    </section>
  );
}

export default function PreferencesPage() {
  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="topbar-row">
            <div className="brand">
              <span>Trilha de inglês</span>
              <strong>Preferências</strong>
            </div>
            <div className="head-actions">
              <Link className="btn small" href="/vocabulario">
                Vocabulário
              </Link>
              <Link className="btn small" href="/">
                ← Voltar ao plano
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="wrap vocab-page">
        <h1 className="vocab-title">Preferências e permissões</h1>
        <p className="vocab-lead">
          O navegador só libera microfone e localização depois que você permite. Aqui você vê o
          que está liberado, pede o que falta e testa se está funcionando.
        </p>
        <AudioSection />
        <LocationSection />
        <CalendarSection />
      </main>
    </>
  );
}
