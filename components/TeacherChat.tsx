"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_QUESTION, validateQuestion, type ChatMessage } from "@/lib/lesson-parts";
import { postLicoes } from "@/lib/licoes-client";

/**
 * "Pergunte ao professor": a conversa salva de uma parte da lição da semana. É a mesma
 * conversa na página da lição e no Estudo do dia.
 */
export default function TeacherChat({
  weekLessonId,
  partIdx,
  initial,
  apiKey,
  accessCode,
  onMessages,
  readOnly = false,
}: {
  weekLessonId: string;
  partIdx: number;
  initial: ChatMessage[];
  apiKey: string;
  accessCode: string;
  /** Avisa quem guarda a conversa, para ela não sumir ao trocar de parte e voltar. */
  onMessages?: (novas: ChatMessage[]) => void;
  /** Dia revisto: mostra a conversa, sem o campo de perguntar. */
  readOnly?: boolean;
}) {
  const [mensagens, setMensagens] = useState<ChatMessage[]>(initial);
  const [texto, setTexto] = useState("");
  const [esperando, setEsperando] = useState(false);
  const [erro, setErro] = useState("");
  // Trava na hora do envio: Enter duas vezes, ou Enter + clique, mandariam duas perguntas.
  const enviando = useRef(false);

  // Trocou de parte (ou o histórico chegou depois): mostra a conversa dela. Depende dos
  // ids, não do array, para um novo render do pai não apagar as mensagens recém-enviadas.
  const idsIniciais = initial.map((m) => m.id).join(",");
  const iniciais = useRef(initial);
  iniciais.current = initial;
  useEffect(() => {
    setMensagens(iniciais.current);
    setErro("");
  }, [weekLessonId, partIdx, idsIniciais]);

  const enviar = async () => {
    if (enviando.current) return;
    const pergunta = texto.trim();
    const invalida = validateQuestion(pergunta);
    if (invalida) {
      setErro(invalida);
      return;
    }
    enviando.current = true;
    setEsperando(true);
    setErro("");
    try {
      const r = await postLicoes<{ messages: ChatMessage[] }>({
        action: "ask",
        weekLessonId,
        partIdx,
        question: pergunta,
        apiKey: apiKey || undefined,
        accessCode: accessCode || undefined,
      });
      setMensagens((m) => [...m, ...r.messages]);
      onMessages?.(r.messages);
      setTexto("");
    } catch (e) {
      // O texto continua no campo para tentar de novo.
      setErro(e instanceof Error ? e.message : "O professor não conseguiu responder agora.");
    } finally {
      enviando.current = false;
      setEsperando(false);
    }
  };

  const longa = texto.length > MAX_QUESTION;

  return (
    <section className="study-block licao-chat" aria-labelledby={`chat-${partIdx}`}>
      <span className="study-kicker">Dúvidas</span>
      <h2 id={`chat-${partIdx}`}>Pergunte ao professor</h2>

      {mensagens.length === 0 && !esperando && (
        <p className="faint">
          {readOnly
            ? "Nenhuma dúvida foi enviada nesta parte."
            : "Ficou alguma dúvida sobre esta parte? Escreva aqui, em português mesmo."}
        </p>
      )}

      {mensagens.length > 0 && (
        <ul className="licao-msgs">
          {mensagens.map((m) => (
            <li key={m.id} className={`licao-msg${m.role === "professor" ? " licao-msg-teacher" : ""}`}>
              <span className="licao-msg-who">{m.role === "professor" ? "Professor" : "Você"}</span>
              <p>{m.text}</p>
            </li>
          ))}
        </ul>
      )}

      {esperando && <p className="faint">O professor está escrevendo…</p>}
      {erro && <p className="lesson-error">{erro}</p>}

      {!readOnly && (
        <>
          <div className="licao-ask">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void enviar();
                }
              }}
              rows={2}
              placeholder="Ex.: por que é “I am” e não “I is”?"
              aria-label="Sua dúvida para o professor"
              disabled={esperando}
            />
            <button
              className="btn primary"
              onClick={() => void enviar()}
              disabled={esperando || longa || !texto.trim()}
            >
              {esperando ? "Enviando…" : "Enviar"}
            </button>
          </div>
          {texto.length > 900 && (
            <p className={longa ? "lesson-error" : "faint"}>
              {texto.length}/{MAX_QUESTION} caracteres
            </p>
          )}
          <p className="faint licao-hint">Enter envia · Shift+Enter quebra a linha</p>
        </>
      )}
    </section>
  );
}
