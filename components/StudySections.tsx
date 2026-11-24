"use client";

import type { Study } from "@/lib/lesson-prompt";
import { Pron } from "./Pron";
import { Speak } from "./SpeechButtons";

/** Teoria e dicas do estudo do dia, antes dos exercícios. */
export default function StudySections({ study }: { study: Study | null }) {
  if (!study) {
    return (
      <p className="study-old">
        Esta lição é anterior à teoria. As próximas já vêm com explicação e dicas.
      </p>
    );
  }
  return (
    <>
      <section className="study-block" aria-labelledby="study-theory">
        <span className="study-kicker">Teoria</span>
        <h2 id="study-theory">{study.topic}</h2>
        {study.goal && <p className="study-goal">{study.goal}</p>}
        {study.explanation.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {study.pattern && (
          <p className="study-pattern">
            <span>Como montar</span>
            {study.pattern}
          </p>
        )}
        {study.examples.length > 0 && (
          <ul className="study-examples">
            {study.examples.map((e) => (
              <li className="study-example" key={e.en}>
                <span className="study-en">
                  <span className="en">{e.en}</span>
                  <Speak text={e.en} showIpa={false} />
                </span>
                <Pron text={e.en} explicit={e.pron} />
                {e.pt && <span className="study-pt">{e.pt}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {study.tips.length > 0 && (
        <section className="study-block" aria-labelledby="study-tips">
          <span className="study-kicker">Dicas</span>
          <h2 id="study-tips">Para não errar</h2>
          <ul className="study-tips">
            {study.tips.map((t) => (
              <li key={t.text}>
                <p>{t.text}</p>
                {(t.wrong || t.right) && (
                  <p className="study-compare">
                    {t.wrong && <span className="study-wrong">✗ {t.wrong}</span>}
                    {t.right && (
                      <span className="study-right">
                        ✓ {t.right} <Pron text={t.right} />
                      </span>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
