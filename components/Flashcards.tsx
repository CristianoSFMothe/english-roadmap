"use client";

import { useEffect, useMemo, useState } from "react";
import type { Card, Week } from "@/lib/content";
import { Pron } from "./Pron";
import { SayIt, Speak } from "./SpeechButtons";

type Dir = "en-pt" | "pt-en";
type Marks = Record<string, boolean>;
type SetMarks = (next: (prev: Marks) => Marks) => void;

export default function Flashcards({
  week,
  known,
  setKnown,
  title,
}: {
  week: Pick<Week, "n" | "cards" | "vocabGroups">;
  known: Marks;
  setKnown: SetMarks;
  /** Rótulo do contador; por padrão, "Semana N". */
  title?: string;
}) {
  const [group, setGroup] = useState<string>("all");
  const [dir, setDir] = useState<Dir>("en-pt");
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  // O cartão atual é guardado pelo id: ao marcar "Já sei" com o filtro ligado ele sai
  // da pilha, mas continua possível voltar a ele pelo histórico.
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);

  const deck: Card[] = useMemo(() => {
    let cards = group === "all" ? week.cards : week.cards.filter((c) => c.group === group);
    if (onlyUnknown) cards = cards.filter((c) => !known[c.id]);
    return cards;
    // known entra de propósito: ao filtrar, a pilha reage ao que já foi marcado
  }, [week, group, onlyUnknown, known]);

  useEffect(() => {
    setCurrentId(null);
    setHistory([]);
    setFlipped(false);
  }, [group, onlyUnknown, week.n, dir]);

  const card = (currentId && week.cards.find((c) => c.id === currentId)) || deck[0];
  const pos = card ? deck.findIndex((c) => c.id === card.id) : -1;
  const weekKnown = week.cards.filter((c) => known[c.id]).length;

  const goTo = (nextId: string | null) => {
    if (card) setHistory((h) => [...h, card.id]);
    setCurrentId(nextId);
    setFlipped(false);
  };

  const nextId = (skipCurrent: boolean) => {
    if (!card || deck.length === 0) return null;
    const rest = skipCurrent ? deck.filter((c) => c.id !== card.id) : deck;
    if (rest.length === 0) return null;
    // Procura o próximo depois da posição atual; um cartão revisto fora da pilha
    // recomeça do início dela.
    const after = deck.slice(pos + 1).find((c) => rest.includes(c));
    return (after ?? rest[0]).id;
  };

  const advance = () => goTo(nextId(false));

  const back = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setCurrentId(prev);
    setFlipped(false);
  };

  const mark = (value: boolean) => {
    if (!card) return;
    const leaves = onlyUnknown && value;
    const next = nextId(leaves);
    setKnown((prev) => ({ ...prev, [card.id]: value }));
    goTo(next);
  };

  return (
    <section>
      <div className="fc-top">
        <div className="chips" role="group" aria-label="Grupo de vocabulário">
          <button
            className="chip"
            aria-pressed={group === "all"}
            onClick={() => setGroup("all")}
          >
            Todos · {week.cards.length}
          </button>
          {week.vocabGroups.map((g) => (
            <button
              key={g.group}
              className="chip"
              aria-pressed={group === g.group}
              onClick={() => setGroup(g.group)}
            >
              {g.group} · {g.cards.length}
            </button>
          ))}
        </div>
        <div className="chips">
          <button
            className="chip"
            aria-pressed={dir === "en-pt"}
            onClick={() => setDir(dir === "en-pt" ? "pt-en" : "en-pt")}
          >
            {dir === "en-pt" ? "Inglês → português" : "Português → inglês"}
          </button>
          <button
            className="chip"
            aria-pressed={onlyUnknown}
            onClick={() => setOnlyUnknown((v) => !v)}
          >
            Só as que faltam
          </button>
        </div>
      </div>

      {card ? (
        <>
          <button
            className="flashcard"
            onClick={() => setFlipped((f) => !f)}
            aria-live="polite"
          >
            <span className="side">
              {card.group} ·{" "}
              {pos >= 0 ? `cartão ${pos + 1} de ${deck.length}` : "revendo, fora da pilha atual"}
            </span>
            {dir === "en-pt" ? (
              <>
                <span className="term en">{card.en}</span>
                <Pron text={card.en} explicit={card.say} noButton className="fc-say" />
                {flipped ? (
                  <span className="answer">{card.pt}</span>
                ) : (
                  <span className="hint">Toque para ver a tradução</span>
                )}
              </>
            ) : (
              <>
                <span className="term">{card.pt}</span>
                {flipped ? (
                  <>
                    <span className="answer en">{card.en}</span>
                    <Pron text={card.en} explicit={card.say} noButton className="fc-say" />
                  </>
                ) : (
                  <span className="hint">Toque para ver em inglês</span>
                )}
              </>
            )}
            {known[card.id] ? <span className="side">✓ aprendida</span> : null}
          </button>

          <div className="fc-voice">
            <Speak text={card.en} />
            <SayIt expected={card.en} />
            <Pron text={card.en} explicit={card.say} buttonOnly />
          </div>

          <div className="fc-actions">
            <button className="btn" onClick={back} disabled={history.length === 0}>
              ← Voltar
            </button>
            <button className="btn" onClick={() => mark(false)}>
              Ainda não sei
            </button>
            <button
              className="btn ok"
              onClick={() => mark(true)}
              aria-label={known[card.id] ? "Aprendido. Ir para o próximo cartão" : undefined}
            >
              {known[card.id] ? "✓ Aprendido" : "Já sei"}
            </button>
            <button className="btn" onClick={advance}>
              Pular →
            </button>
          </div>

          <div className="fc-progress">
            <span>
              {title ?? `Semana ${week.n}`}: {weekKnown} de {week.cards.length} aprendidas
            </span>
            <span>Na pilha atual: {deck.length}</span>
            <span>Use no Anki as que você errar duas vezes aqui.</span>
          </div>
        </>
      ) : (
        <>
          <p className="empty">
            Nenhum cartão nesta pilha. Desmarque &quot;só as que faltam&quot; ou escolha
            outro grupo.
          </p>
          {history.length > 0 && (
            <div className="fc-actions">
              <button className="btn" onClick={back}>
                ← Voltar ao último cartão
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
