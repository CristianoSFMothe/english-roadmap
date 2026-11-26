"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, RawWeek } from "@/lib/content";
import { buildWeeks } from "@/lib/content";
import { useSession } from "@/lib/auth-client";
import { usePersistentState } from "@/lib/storage";
import { CATEGORIES, numberToWords, type MyWord, type RefCategory } from "@/lib/vocabulary";
import Flashcards from "./Flashcards";
import VerbsView from "./VerbsView";
import { Pron, PronListButton } from "./Pron";
import { SayIt, Speak } from "./SpeechButtons";
import { generatePron, knownPron } from "@/lib/use-pron";
import { pronKey } from "@/lib/pronunciation";
import { readPrefs, writePrefs, type Speed } from "@/lib/speech";

type Marks = Record<string, boolean>;
type GeneratedPlan = { id: string; weeks: RawWeek[] };

const MINE = "minhas";
const LEARNED = "aprendidas";

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function categoryDeck(cat: RefCategory) {
  const vocabGroups = cat.groups.map((g) => ({
    group: g.title,
    cards: g.items.map(
      (i): Card => ({
        en: i.en,
        // Sem tradução (letras do alfabeto), a pronúncia fica no verso, como antes.
        pt: i.pt || i.say || "",
        ...(i.pt && i.say ? { say: i.say } : {}),
        group: g.title,
        id: `ref:${cat.id}:${i.en}`,
      }),
    ),
  }));
  return { n: 0, vocabGroups, cards: vocabGroups.flatMap((g) => g.cards) };
}

function NumberConverter() {
  const [value, setValue] = useState("2026");
  const n = Number(value);
  const words = value.trim() === "" ? "" : numberToWords(n);
  return (
    <div className="converter">
      <div className="field">
        <label htmlFor="num-in">Digite um número de 0 a 1.000.000</label>
        <input
          id="num-in"
          type="number"
          inputMode="numeric"
          min={0}
          max={1000000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <div className="converter-out" aria-live="polite">
        {words ? (
          <>
            <span className="faint">{n.toLocaleString("en-US")}</span>
            <strong>{words}</strong>
            <Speak text={words} />
          </>
        ) : (
          <span className="faint">Use um número inteiro entre 0 e 1.000.000.</span>
        )}
      </div>
    </div>
  );
}

function CategoryView({
  cat,
  known,
  setKnown,
}: {
  cat: RefCategory;
  known: Marks;
  setKnown: (next: (prev: Marks) => Marks) => void;
}) {
  const [practice, setPractice] = useState(false);
  const deck = useMemo(() => categoryDeck(cat), [cat]);

  return (
    <section className="card">
      <div className="section-title vocab-head">
        <h2>{cat.title}</h2>
        <span>{deck.cards.length} itens</span>
        <button className="btn small" onClick={() => setPractice((p) => !p)}>
          {practice ? "Ver a lista" : "Praticar com flashcards"}
        </button>
      </div>
      {cat.intro && <p className="vocab-intro">{cat.intro}</p>}

      {practice ? (
        <Flashcards
          key={cat.id}
          week={deck}
          known={known}
          setKnown={setKnown}
          title={cat.title}
        />
      ) : (
        <>
          {cat.id === "numeros" && <NumberConverter />}
          {cat.groups.map((g) => (
            <div className="vocab-group" key={g.title}>
              <h3>
                {g.title} · {g.items.length}
              </h3>
              <ul className="vocab-list rich">
                {g.items.map((i) => (
                  <li key={i.en}>
                    <span className="vt">
                      <span className="en">{i.en}</span>
                      {i.say && <span className="say">{i.say}</span>}
                    </span>
                    {i.pt && <span className="pt">{i.pt}</span>}
                    <Speak text={i.en} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function MyWordsView({
  words,
  setWords,
}: {
  words: MyWord[];
  setWords: (next: (prev: MyWord[]) => MyWord[]) => void;
}) {
  const [en, setEn] = useState("");
  const [pt, setPt] = useState("");
  // Até a pessoa escolher, o tipo segue o texto: três palavras ou mais viram frase.
  const [chosenKind, setChosenKind] = useState<MyWord["kind"] | null>(null);
  const kind: MyWord["kind"] =
    chosenKind ?? (en.trim().split(/\s+/).length >= 3 ? "frase" : "palavra");
  const [example, setExample] = useState("");
  const [say, setSay] = useState("");
  const [sayState, setSayState] = useState<"idle" | "busy" | "failed">("idle");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todas" | "palavra" | "frase" | "faltam">("todas");
  const [practice, setPractice] = useState(false);
  const enRef = useRef<HTMLInputElement>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!en.trim()) return;
    const word: MyWord = {
      id: newId(),
      en: en.trim(),
      pt: pt.trim(),
      kind,
      ...(example.trim() ? { example: example.trim() } : {}),
      ...(say.trim() || knownPron(en.trim()) ? { say: say.trim() || knownPron(en.trim()) } : {}),
      learned: false,
      createdAt: Date.now(),
    };
    setWords((prev) => [word, ...prev]);
    setEn("");
    setPt("");
    setExample("");
    setSay("");
    setSayState("idle");
    setChosenKind(null);
    enRef.current?.focus();
  };

  /** Preenche o campo de pronúncia: dicionário/cache, senão o Gemini (só no clique). */
  const fillSay = async () => {
    const text = en.trim();
    if (!text) return;
    const known = knownPron(text);
    if (known) {
      setSay(known);
      return;
    }
    setSayState("busy");
    const got = (await generatePron([text]))[pronKey(text)];
    if (got) {
      setSay(got);
      setSayState("idle");
    } else setSayState("failed");
  };

  /** Grava em cada palavra a pronúncia gerada pelo botão da lista. */
  const saveGenerated = (map: Record<string, string>) =>
    setWords((prev) =>
      prev.map((w) => (w.say || !map[pronKey(w.en)] ? w : { ...w, say: map[pronKey(w.en)] })),
    );

  const q = query.trim().toLowerCase();
  const shown = words.filter((w) => {
    if (filter === "palavra" || filter === "frase") {
      if (w.kind !== filter) return false;
    }
    if (filter === "faltam" && w.learned) return false;
    if (!q) return true;
    return [w.en, w.pt, w.example ?? ""].some((t) => t.toLowerCase().includes(q));
  });

  const known = useMemo(
    () => Object.fromEntries(words.map((w) => [w.id, Boolean(w.learned)])),
    [words],
  );
  const setKnown = (next: (prev: Marks) => Marks) =>
    setWords((prev) => {
      const marks = next(Object.fromEntries(prev.map((w) => [w.id, Boolean(w.learned)])));
      return prev.map((w) => ({ ...w, learned: Boolean(marks[w.id]) }));
    });

  const deck = useMemo(() => {
    const groups = (["palavra", "frase"] as const)
      .map((k) => ({
        group: k === "palavra" ? "Palavras" : "Frases",
        cards: words
          .filter((w) => w.kind === k)
          .map(
            (w): Card => ({
              en: w.en,
              pt: w.pt || "(sem tradução)",
              group: k,
              id: w.id,
              ...(w.say ? { say: w.say } : {}),
            }),
          ),
      }))
      .filter((g) => g.cards.length > 0);
    return { n: 0, vocabGroups: groups, cards: groups.flatMap((g) => g.cards) };
  }, [words]);

  const learnedCount = words.filter((w) => w.learned).length;

  return (
    <section className="card">
      <div className="section-title vocab-head">
        <h2>Minhas palavras e frases</h2>
        <span>
          {words.length} salvas · {learnedCount} aprendidas
        </span>
        {words.length > 0 && (
          <button className="btn small" onClick={() => setPractice((p) => !p)}>
            {practice ? "Ver a lista" : "Praticar com flashcards"}
          </button>
        )}
      </div>
      <p className="vocab-intro">
        Guarde aqui o que você aprende no dia a dia: palavras de uma série, uma frase que ouviu
        numa música, uma expressão do trabalho. Depois pratique tudo nos flashcards.
      </p>

      {practice ? (
        <Flashcards
          week={deck}
          known={known}
          setKnown={setKnown}
          title="Minhas palavras"
        />
      ) : (
        <>
          <form className="word-form" onSubmit={add}>
            <div className="field">
              <label htmlFor="w-en">Em inglês</label>
              <input
                id="w-en"
                ref={enRef}
                value={en}
                onChange={(e) => setEn(e.target.value)}
                placeholder="Ex.: I'm looking forward to it"
                autoComplete="off"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="w-pt">Em português</label>
              <input
                id="w-pt"
                value={pt}
                onChange={(e) => setPt(e.target.value)}
                placeholder="Ex.: Estou ansioso por isso"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="w-kind">Tipo</label>
              <select
                id="w-kind"
                value={kind}
                onChange={(e) => setChosenKind(e.target.value as MyWord["kind"])}
              >
                <option value="palavra">Palavra</option>
                <option value="frase">Frase ou expressão</option>
              </select>
            </div>
            <div className="field span-2">
              <label htmlFor="w-say">Pronúncia (opcional)</label>
              <div className="say-field">
                <input
                  id="w-say"
                  value={say}
                  onChange={(e) => setSay(e.target.value)}
                  placeholder="Ex.: ái ém lú-king fór-uârd tu ít"
                  autoComplete="off"
                  maxLength={300}
                />
                <button
                  type="button"
                  className="pron-btn"
                  onClick={() => void fillSay()}
                  disabled={!en.trim() || sayState === "busy"}
                >
                  {sayState === "busy" ? "Gerando…" : "Gerar"}
                </button>
              </div>
              {sayState === "failed" && <span className="say-result bad">Não deu para gerar agora</span>}
            </div>
            <div className="field span-2">
              <label htmlFor="w-ex">Exemplo ou onde você viu (opcional)</label>
              <input
                id="w-ex"
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="Ex.: ouvi num episódio de série"
                autoComplete="off"
              />
            </div>
            <button className="btn primary" type="submit" disabled={!en.trim()}>
              Adicionar
            </button>
          </form>

          {words.length > 0 && (
            <div className="word-tools">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar nas suas palavras"
                aria-label="Buscar nas suas palavras"
              />
              <div className="chips" role="group" aria-label="Filtrar">
                {(
                  [
                    ["todas", "Todas"],
                    ["palavra", "Palavras"],
                    ["frase", "Frases"],
                    ["faltam", "Faltam aprender"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    className="chip"
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {words.length > 0 && (
            <div className="pron-list-row">
              <PronListButton texts={words.filter((w) => !w.say).map((w) => w.en)} onGenerated={saveGenerated} />
            </div>
          )}

          {words.length === 0 ? (
            <p className="empty">Nenhuma palavra ainda. Adicione a primeira acima.</p>
          ) : shown.length === 0 ? (
            <p className="empty">Nada encontrado com esse filtro.</p>
          ) : (
            <ul className="word-list">
              {shown.map((w) => (
                <li key={w.id} className={w.learned ? "learned" : undefined}>
                  <div className="word-main">
                    <span className="en">{w.en}</span>
                    <Pron text={w.en} explicit={w.say} noButton />
                    {w.pt && <span className="pt">{w.pt}</span>}
                    {w.example && <span className="note">{w.example}</span>}
                  </div>
                  <span className="kind">{w.kind === "frase" ? "frase" : "palavra"}</span>
                  <Speak text={w.en} />
                  <SayIt expected={w.en} />
                  <button
                    className="chip"
                    aria-pressed={Boolean(w.learned)}
                    onClick={() =>
                      setWords((prev) =>
                        prev.map((x) => (x.id === w.id ? { ...x, learned: !x.learned } : x)),
                      )
                    }
                  >
                    {w.learned ? "✓ Aprendida" : "Marcar aprendida"}
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Remover ${w.en}`}
                    title="Remover"
                    onClick={() => setWords((prev) => prev.filter((x) => x.id !== w.id))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function LearnedView({ sample }: { sample: RawWeek[] }) {
  const [plan] = usePersistentState<GeneratedPlan | null>("plan", null);
  const planId = plan?.id ?? "sample";
  const [known] = usePersistentState<Marks>(`known:${planId}`, {});
  const weeks = useMemo(() => buildWeeks(plan?.weeks ?? sample), [plan, sample]);
  const byWeek = weeks
    .map((w) => ({ n: w.n, theme: w.theme, cards: w.cards.filter((c) => known[c.id]) }))
    .filter((w) => w.cards.length > 0);
  const total = byWeek.reduce((s, w) => s + w.cards.length, 0);

  return (
    <section className="card">
      <div className="section-title vocab-head">
        <h2>Aprendidas nos flashcards do plano</h2>
        <span>{total} palavras</span>
      </div>
      <p className="vocab-intro">
        As palavras do seu plano que você marcou com &quot;Já sei&quot; nos flashcards de cada
        semana.
      </p>
      {total === 0 ? (
        <p className="empty">
          Nenhuma ainda. Nos flashcards da semana, clique em &quot;Já sei&quot; nas palavras que
          você domina e elas aparecem aqui.
        </p>
      ) : (
        byWeek.map((w) => (
          <div className="vocab-group" key={w.n}>
            <h3>
              Semana {w.n} · {w.theme} · {w.cards.length}{" "}
              <PronListButton texts={w.cards.filter((c) => !c.say).map((c) => c.en)} />
            </h3>
            <ul className="vocab-list rich">
              {w.cards.map((c) => (
                <li key={c.id}>
                  <span className="vt">
                    <span className="en">{c.en}</span>
                    <Pron text={c.en} explicit={c.say} noButton />
                  </span>
                  <span className="pt">{c.pt}</span>
                  <Speak text={c.en} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

/** Velocidade da pronúncia, a mesma das Preferências. */
function SpeedToggle() {
  const [speed, setSpeed] = useState<Speed>("normal");
  useEffect(() => setSpeed(readPrefs().speed), []);
  const change = (next: Speed) => {
    setSpeed(next);
    writePrefs({ ...readPrefs(), speed: next });
  };
  return (
    <div className="chips" role="group" aria-label="Velocidade da pronúncia">
      <span className="faint speed-label">Pronúncia:</span>
      <button className="chip" aria-pressed={speed === "normal"} onClick={() => change("normal")}>
        Normal
      </button>
      <button className="chip" aria-pressed={speed === "devagar"} onClick={() => change("devagar")}>
        Devagar
      </button>
    </div>
  );
}

export default function VocabularyPage({
  sample,
  authEnabled,
}: {
  sample: RawWeek[];
  authEnabled: boolean;
}) {
  const [tab, setTab] = usePersistentState<string>("vocabTab", MINE);
  const [words, setWords] = usePersistentState<MyWord[]>("myWords", []);
  const [refKnown, setRefKnown] = usePersistentState<Marks>("knownRef", {});

  const { data: session } = useSession();
  const userId = authEnabled ? (session?.user?.id ?? null) : null;
  const pulled = useRef<string | null>(null);

  // Ao entrar: o que está no servidor vale. Se lá nunca houve nada, sobe o que está aqui.
  useEffect(() => {
    if (!userId || pulled.current === userId) return;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/vocab");
        const data = (await res.json()) as { signedIn?: boolean; words?: MyWord[] | null };
        if (cancelado || !data.signedIn) return;
        if (data.words) setWords(data.words);
        else if (words.length) {
          await fetch("/api/vocab", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ words }),
          });
        }
        pulled.current = userId;
      } catch {
        /* sem rede: segue com o que está no navegador */
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId || pulled.current !== userId) return;
    const t = setTimeout(() => {
      fetch("/api/vocab", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ words }),
      }).catch(() => {
        /* tenta de novo na próxima mudança */
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [userId, words]);

  const tabs = [
    { id: MINE, title: `Minhas palavras · ${words.length}` },
    { id: LEARNED, title: "Aprendidas" },
    ...CATEGORIES.map((c) => ({ id: c.id, title: c.title })),
  ];
  const current = CATEGORIES.find((c) => c.id === tab);

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="topbar-row">
            <div className="brand">
              <span>Trilha de inglês</span>
              <strong>Vocabulário</strong>
            </div>
            <div className="head-actions">
              <Link className="btn small" href="/estudo-diario">
                Estudo do dia
              </Link>
              <Link className="btn small" href="/licoes">
                Lições
              </Link>
              <Link className="btn small" href="/preferencias">
                Preferências
              </Link>
              <Link className="btn small" href="/">
                ← Voltar ao plano
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="wrap vocab-page">
        <h1 className="vocab-title">Vocabulário de inglês</h1>
        <p className="vocab-lead">
          Alfabeto com pronúncia, números até 1 milhão, dias, meses, família, verbos e
          expressões do dia a dia, além das palavras e frases que você guardar.
        </p>
        <SpeedToggle />

        <nav className="chips vocab-tabs" aria-label="Seções do vocabulário">
          {tabs.map((t) => (
            <button
              key={t.id}
              className="chip"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.title}
            </button>
          ))}
        </nav>

        {tab === LEARNED ? (
          <LearnedView sample={sample} />
        ) : current?.id === "verbos" ? (
          <VerbsView known={refKnown} setKnown={setRefKnown} />
        ) : current ? (
          <CategoryView key={current.id} cat={current} known={refKnown} setKnown={setRefKnown} />
        ) : (
          <MyWordsView words={words} setWords={setWords} />
        )}
      </main>
    </>
  );
}
