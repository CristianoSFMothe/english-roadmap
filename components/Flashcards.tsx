"use client";

import { useEffect, useMemo, useState } from "react";
import type { Card, Week } from "@/lib/content";

type Dir = "en-pt" | "pt-en";

export default function Flashcards({
  week,
  known,
  setKnown,
}: {
  week: Week;
  known: Record<string, boolean>;
  setKnown: (next: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}) {
  const [group, setGroup] = useState<string>("all");
  const [dir, setDir] = useState<Dir>("en-pt");
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const deck: Card[] = useMemo(() => {
    let cards = group === "all" ? week.cards : week.cards.filter((c) => c.group === group);
    if (onlyUnknown) cards = cards.filter((c) => !known[c.id]);
    return cards;
    // known entra de propósito: ao filtrar, a pilha reage ao que já foi marcado
  }, [week, group, onlyUnknown, known]);

  useEffect(() => {
    setPos(0);
    setFlipped(false);
  }, [group, onlyUnknown, week.n, dir]);

  const card = deck[pos];
  const weekKnown = week.cards.filter((c) => known[c.id]).length;

  const advance = () => {
    setFlipped(false);
    setPos((p) => (deck.length === 0 ? 0 : (p + 1) % deck.length));
  };

  const mark = (value: boolean) => {
    if (!card) return;
    setKnown((prev) => ({ ...prev, [card.id]: value }));
    advance();
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
              {card.group} · cartão {pos + 1} de {deck.length}
            </span>
            {dir === "en-pt" ? (
              <>
                <span className="term en">{card.en}</span>
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
                  <span className="answer en">{card.en}</span>
                ) : (
                  <span className="hint">Toque para ver em inglês</span>
                )}
              </>
            )}
            {known[card.id] ? <span className="side">já marcada como sabida</span> : null}
          </button>

          <div className="fc-actions">
            <button className="btn" onClick={() => mark(false)}>
              Ainda não sei
            </button>
            <button className="btn ok" onClick={() => mark(true)}>
              Já sei
            </button>
            <button className="btn" onClick={advance}>
              Pular
            </button>
          </div>

          <div className="fc-progress">
            <span>
              Semana {week.n}: {weekKnown} de {week.cards.length} marcadas
            </span>
            <span>Na pilha atual: {deck.length}</span>
            <span>Use no Anki as que você errar duas vezes aqui.</span>
          </div>
        </>
      ) : (
        <p className="empty">
          Nenhum cartão nesta pilha. Desmarque &quot;só as que faltam&quot; ou escolha
          outro grupo.
        </p>
      )}
    </section>
  );
}
