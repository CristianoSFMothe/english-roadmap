"use client";

import { generatePron, useMissingPron, usePron } from "@/lib/use-pron";

/**
 * Pronúncia aproximada (sons do português) de um texto em inglês.
 * Sem pronúncia conhecida, mostra o botão "Gerar pronúncia" (Gemini, só no clique).
 */
export function Pron({
  text,
  explicit,
  className,
  noButton,
  buttonOnly,
}: {
  text: string;
  explicit?: string;
  className?: string;
  /** Só a pronúncia, sem o botão (a lista usa o botão dela). */
  noButton?: boolean;
  /** Só o botão, sem a pronúncia (ex.: fora do flashcard, que já é um botão). */
  buttonOnly?: boolean;
}) {
  const { say, status, generate } = usePron(text, explicit);
  if (status === "ready" && say)
    return buttonOnly ? null : (
      <span className={`say ${className ?? ""}`.trim()}>({say})</span>
    );
  if (status === "checking" || noButton) return null;
  return (
    <span className="pron-gen">
      {status === "failed" && (
        <span className="say-result bad">Não deu para gerar agora</span>
      )}
      <button
        type="button"
        className="pron-btn"
        disabled={status === "generating"}
        onClick={() => void generate()}
      >
        {status === "generating" ? "Gerando…" : "Gerar pronúncia"}
      </button>
    </span>
  );
}

/** Botão de lista: gera de uma vez a pronúncia dos itens que ainda estão sem ela. */
export function PronListButton({
  texts,
  onGenerated,
}: {
  texts: string[];
  /** Recebe o que foi gerado ({ pronKey: pronúncia }), para quem quer gravar em outro lugar. */
  onGenerated?: (say: Record<string, string>) => void;
}) {
  const { missing, generating, failed } = useMissingPron(texts);
  if (!missing.length && !generating) return null;
  return (
    <span className="pron-gen">
      {failed && !generating && (
        <span className="say-result bad">Não deu para gerar agora</span>
      )}
      <button
        type="button"
        className="pron-btn"
        disabled={generating}
        onClick={() =>
          void generatePron(missing).then((say) => onGenerated?.(say))
        }
      >
        {generating
          ? "Gerando…"
          : missing.length === 1
            ? "Gerar pronúncia de 1 item"
            : `Gerar pronúncia de ${missing.length} itens`}
      </button>
    </span>
  );
}
