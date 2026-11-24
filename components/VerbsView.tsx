"use client";

import { useMemo, useState } from "react";
import type { Card } from "@/lib/content";
import { sayPhrase } from "@/lib/pronunciation";
import { usePersistentState } from "@/lib/storage";
import {
  buildExamples,
  buildTense,
  findVerb,
  shortAnswers,
  statNotice,
  TENSES,
  VERBS,
  type Line,
  type TenseId,
  type TenseInfo,
  type Verb,
} from "@/lib/verbs";
import Flashcards from "./Flashcards";
import { Speak } from "./SpeechButtons";

type Marks = Record<string, boolean>;

const PT_PERSON: Record<string, string> = {
  I: "eu",
  you: "você",
  he: "ele",
  she: "ela",
  it: "isso",
  we: "nós",
  they: "eles",
};

const BASIC_COLUMNS = ["Presente", "Passado", "Futuro", "Negativa", "Pergunta"];
const TENSE_COLUMNS = ["Afirmativa", "Negativa", "Pergunta"];

const EXTRAS = [
  { key: "phrases", title: "Frases" },
  { key: "questions", title: "Perguntas" },
  { key: "words", title: "Palavras e expressões" },
  { key: "conversation", title: "Conversa" },
] as const;

/** Linha da tabela, igual para o Básico e para os outros tempos. */
type ViewRow = {
  person: string;
  cells: Line[];
  affirmative: Line;
  negative: Line;
  question: Line;
  short: string[];
  shortSay: string[];
};

/** Linhas do tempo escolhido; null quando o verbo de estado não vai para esse tempo. */
function tableRows(verb: Verb, tense: TenseId): ViewRow[] | null {
  if (tense === "basic")
    return verb.table.map((r) => ({
      person: r.person,
      cells: [r.present, r.past, r.future, r.negative, r.question],
      affirmative: r.present,
      negative: r.negative,
      question: r.question,
      short: r.short,
      shortSay: r.shortSay,
    }));
  const rows = buildTense(verb, tense);
  return rows
    ? rows.map((r) => ({ ...r, cells: [r.affirmative, r.negative, r.question] }))
    : null;
}

function verbDeck(verb: Verb, tense: TenseId, rows: ViewRow[] | null) {
  const columns = tense === "basic" ? BASIC_COLUMNS : TENSE_COLUMNS;
  // O Básico mantém os ids antigos, para não perder o "já sei" salvo.
  const prefix = tense === "basic" ? `verbo:${verb.id}` : `verbo:${verb.id}:${tense}`;
  const card = (group: string, line: Line, idPrefix = prefix): Card => {
    const say = line.say ?? sayPhrase(line.en);
    return {
      en: line.en,
      pt: line.pt,
      ...(say ? { say } : {}),
      group,
      id: `${idPrefix}:${group}:${line.en}`,
    };
  };
  const vocabGroups = [
    ...columns.map((title, c) => ({
      group: title,
      cards: (rows ?? []).map((r) => card(title, r.cells[c])),
    })),
    ...EXTRAS.map((e) => ({
      group: e.title,
      cards: verb[e.key].map((l) => card(e.title, l, `verbo:${verb.id}`)),
    })),
  ].filter((g) => g.cards.length > 0);
  return { n: 0, vocabGroups, cards: vocabGroups.flatMap((g) => g.cards) };
}

function Cell({ line }: { line: Line }) {
  return (
    <>
      <span className="verb-en">
        <span className="en">{line.en}</span>
        {line.say && <span className="say verb-say">({line.say})</span>}
        <Speak text={line.en} showIpa={false} />
      </span>
      <span className="verb-pt">{line.pt}</span>
    </>
  );
}

/** Uma frase de exemplo: inglês, pronúncia, áudio e tradução. */
function ExLine({ label, line }: { label?: string; line: Line }) {
  return (
    <li className="verb-ex">
      {label && <span className="verb-ex-label">{label}</span>}
      <Cell line={line} />
    </li>
  );
}

/** Explicação do tempo, antes da tabela: resumo sempre visível e o resto em "Ver explicação completa". */
function TenseIntro({ info, verb, tense }: { info: TenseInfo; verb: Verb; tense: TenseId }) {
  const [open, setOpen] = usePersistentState<boolean>("verbIntroOpen", false);
  const blocks = buildExamples(verb, tense);
  const answers = shortAnswers(verb, tense);
  const stative = tense !== "basic" && !buildTense(verb, tense);
  return (
    <div className="verb-intro">
      <h3>
        {info.name} <span className="faint">· {info.label}</span>
      </h3>
      <dl>
        <dt>O que é</dt>
        <dd>{info.what}</dd>
        <dt>Em português</dt>
        <dd>{info.pt}</dd>
        <dt>Como montar</dt>
        <dd>
          <p className="verb-how">{info.how}</p>
          {stative && <p className="faint">Exemplo com to work, porque to {verb.base} quase não aparece neste tempo.</p>}
          <div className="verb-ex-blocks">
          {blocks.map((b, i) => (
            <div className="verb-ex-block" key={b.title ?? i}>
              {b.title && <h4>{b.title}</h4>}
              <ul className="verb-ex-list">
                <ExLine label="Afirmativa" line={b.affirmative} />
                <ExLine label="Negativa" line={b.negative} />
                <ExLine label="Pergunta" line={b.question} />
              </ul>
            </div>
          ))}
          </div>
        </dd>
      </dl>

      <details
        className="verb-intro-more"
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>{open ? "Esconder a explicação completa" : "Ver explicação completa"}</summary>
        <dl>
          <dt>Quando usar</dt>
          <dd>
            <ul className="verb-ex-list">
              {info.when.map((w) => (
                <li className="verb-when" key={w.text}>
                  <p>{w.text}</p>
                  <ul className="verb-ex-list">
                    <ExLine line={w.ex} />
                  </ul>
                </li>
              ))}
            </ul>
          </dd>
          <dt>Negativa</dt>
          <dd>{info.negative}</dd>
          <dt>Pergunta</dt>
          <dd>{info.question}</dd>
          <dt>Resposta curta</dt>
          <dd>
            <p className="faint">Para responder uma pergunta de sim ou não, repita só o verbo auxiliar:</p>
            <div className="verb-ex-blocks">
              {blocks.map((b, i) => (
                <div className="verb-ex-block" key={b.title ?? i}>
                  {b.title && <h4>{b.title}</h4>}
                  <ul className="verb-ex-list">
                    {answers.slice(i * 2, i * 2 + 2).map((a) => (
                      <ExLine key={a.en + a.pt} line={a} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </dd>
          <dt>Regras de escrita</dt>
          <dd>
            <ul className="verb-rules">
              {info.spelling.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </dd>
          {info.endings && (
            <>
              <dt>Pronúncia do -s e do -ed</dt>
              <dd>
                <ul className="verb-ex-list">
                  {info.endings.map((e) => (
                    <li className="verb-when" key={e.text}>
                      <p>{e.text}</p>
                      <ul className="verb-ex-list">
                        <ExLine line={e.ex} />
                      </ul>
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          )}
          <dt>Palavras-sinal</dt>
          <dd>
            <p className="faint">Palavras que costumam aparecer junto com este tempo:</p>
            <ul className="verb-signals">
              {info.signals.map((g) => (
                <li key={g.en}>
                  <span className="en">{g.en}</span> <span className="verb-pt">{g.pt}</span>
                </li>
              ))}
            </ul>
          </dd>
          <dt>Erros comuns</dt>
          <dd>
            <ul className="verb-mistakes">
              {info.mistakes.map((m) => (
                <li key={m.wrong}>
                  <span className="verb-wrong">✗ {m.wrong}</span>
                  <span className="verb-arrow" aria-hidden="true">→</span>
                  <span className="verb-right">✓ {m.right}</span>
                  <span className="verb-why">{m.why}</span>
                </li>
              ))}
            </ul>
          </dd>
          <dt>Dica</dt>
          <dd>{info.tip}</dd>
        </dl>
      </details>
    </div>
  );
}

export default function VerbsView({
  known,
  setKnown,
}: {
  known: Marks;
  setKnown: (next: (prev: Marks) => Marks) => void;
}) {
  const [verbId, setVerbId] = usePersistentState<string>("verbId", "be");
  const [tense, setTense] = useState<TenseId>("basic");
  const [practice, setPractice] = useState(false);
  const verb = findVerb(verbId);
  const info = TENSES.find((t) => t.id === tense) ?? TENSES[0];
  const rows = useMemo(() => tableRows(verb, tense), [verb, tense]);
  const deck = useMemo(() => verbDeck(verb, tense, rows), [verb, tense, rows]);
  const columns = tense === "basic" ? BASIC_COLUMNS : TENSE_COLUMNS;

  return (
    <section className="card">
      <div className="section-title vocab-head">
        <h2>Verbos mais usados</h2>
        <span>{VERBS.length} verbos</span>
        <button className="btn small" onClick={() => setPractice((p) => !p)}>
          {practice ? "Ver a tabela" : "Praticar com flashcards"}
        </button>
      </div>

      <div className="verb-pick">
        <div className="verb-selects">
          <div className="field">
            <label htmlFor="verb-select">Escolha o verbo</label>
            <select
              id="verb-select"
              value={verb.id}
              onChange={(e) => {
                setVerbId(e.target.value);
                setPractice(false);
              }}
            >
              {VERBS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} · {v.pt}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tense-select">Escolha o tempo</label>
            <select
              id="tense-select"
              value={tense}
              onChange={(e) => {
                setTense(e.target.value as TenseId);
                setPractice(false);
              }}
            >
              {TENSES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="verb-title">
          <p>
            <strong className="en">{verb.label}</strong> = {verb.pt}{" "}
            <span className="say">({verb.say})</span>
            <Speak text={verb.base} />
          </p>
          <p className="faint">
            Passado: <span className="en">{verb.past}</span> · Particípio:{" "}
            <span className="en">{verb.participle}</span>
          </p>
          {verb.note && <p className="verb-note">{verb.note}</p>}
        </div>
      </div>

      {practice ? (
        <Flashcards
          key={`${verb.id}:${tense}`}
          week={deck}
          known={known}
          setKnown={setKnown}
          title={`${verb.label} · ${info.name}`}
        />
      ) : (
        <>
          <TenseIntro info={info} verb={verb} tense={tense} />

          {rows ? (
            <div className="verb-table-wrap">
              <table className="verb-table">
                <thead>
                  <tr>
                    <th scope="col">Pessoa</th>
                    {columns.map((c) => (
                      <th scope="col" key={c}>
                        {c}
                      </th>
                    ))}
                    <th scope="col">Contrações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.person}>
                      <th scope="row">
                        <span className="en">{r.person}</span>
                        <span className="verb-pt">{PT_PERSON[r.person]}</span>
                      </th>
                      {columns.map((c, k) => (
                        <td key={c} data-label={c}>
                          <Cell line={r.cells[k]} />
                        </td>
                      ))}
                      <td data-label="Contrações">
                        <ul className="verb-short">
                          {r.short.map((s, k) => (
                            <li key={s}>
                              <span className="en">{s}</span>{" "}
                              <span className="say verb-say">({r.shortSay[k]})</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            tense !== "basic" && <p className="verb-stative">{statNotice(verb, tense)}</p>
          )}

          {EXTRAS.map((e) => (
            <div className="vocab-group verb-extra" key={e.key}>
              <h3>
                {e.title} · {verb[e.key].length}
              </h3>
              <ul className="verb-lines">
                {verb[e.key].map((l) => {
                  const say = sayPhrase(l.en);
                  return (
                    <li key={l.en}>
                      <span className="verb-en">
                        <span className="en">{l.en}</span>
                        <Speak text={l.en.replace(/^[AB]: /, "")} showIpa={false} />
                        {say && <span className="say verb-say-line">({say})</span>}
                      </span>
                      <span className="verb-pt">{l.pt}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
