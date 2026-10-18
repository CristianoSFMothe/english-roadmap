"use client";

import { useState } from "react";
import {
  ACCENTS,
  DIFFICULTIES,
  LEVELS,
  TARGETS,
  clampProfile,
  profileIsUsable,
  type Profile,
} from "@/lib/profile";

type Props = {
  initial: Profile;
  onGenerate: (p: Profile) => void;
  onClose: () => void;
};

export default function ProfileForm({ initial, onGenerate, onClose }: Props) {
  const [p, setP] = useState<Profile>(initial);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setP((prev) => ({ ...prev, [key]: value }));

  const toggleDifficulty = (d: string) =>
    setP((prev) => ({
      ...prev,
      difficulties: prev.difficulties.includes(d)
        ? prev.difficulties.filter((x) => x !== d)
        : [...prev.difficulties, d],
    }));

  const ready = profileIsUsable(p);

  const text = (
    key: keyof Profile,
    label: string,
    placeholder: string,
    rows = 2,
  ) => (
    <div className="field">
      <label htmlFor={`pf-${key}`}>{label}</label>
      <textarea
        id={`pf-${key}`}
        value={String(p[key] ?? "")}
        onChange={(e) => set(key, e.target.value as Profile[typeof key])}
        placeholder={placeholder}
        rows={rows}
        style={{ minHeight: rows * 38 + 54 }}
      />
    </div>
  );

  // O clique fora não fecha: a saída é pelo X, pelo Cancelar ou pela geração.
  return (
    <div className="scrim" role="presentation">
      <div
        className="drawer wide"
        role="dialog"
        aria-modal="true"
        aria-label="Meu perfil de estudo"
      >
        <div className="drawer-head">
          <div>
            <span className="dow">Personalização</span>
            <h2>Meu perfil de estudo</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
          Quanto mais específico você for, melhor o plano. Os campos de interesse aceitam
          gêneros, títulos e artistas misturados.
        </p>

        <fieldset className="fs">
          <legend>Seu inglês</legend>
          <div className="row-3">
            <div className="field">
              <label htmlFor="pf-level">Nível atual</label>
              <select id="pf-level" value={p.level} onChange={(e) => set("level", e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pf-target">Nível desejado</label>
              <select id="pf-target" value={p.target} onChange={(e) => set("target", e.target.value)}>
                {TARGETS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pf-accent">Sotaque de preferência</label>
              <select id="pf-accent" value={p.accent} onChange={(e) => set("accent", e.target.value)}>
                {ACCENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Suas dificuldades</label>
            <div className="chips">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="chip"
                  aria-pressed={p.difficulties.includes(d)}
                  onClick={() => toggleDifficulty(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="fs">
          <legend>Quem é você</legend>
          <div className="row-2">
            <div className="field">
              <label htmlFor="pf-name">Nome (opcional)</label>
              <input
                id="pf-name"
                value={p.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Como você quer ser chamado"
              />
            </div>
            <div className="field">
              <label htmlFor="pf-profession">Profissão</label>
              <input
                id="pf-profession"
                value={p.profession}
                onChange={(e) => set("profession", e.target.value)}
                placeholder="Ex.: analista de qualidade de software"
              />
            </div>
          </div>
          {text("knowledge", "Conhecimento e área técnica", "Ex.: testes automatizados, APIs, bancos de dados, finanças", 2)}
        </fieldset>

        <fieldset className="fs">
          <legend>Objetivos</legend>
          {text("goalPersonal", "Objetivo pessoal", "Ex.: entender filmes sem legenda, viajar, conversar com amigos de outros países")}
          {text("goalProfessional", "Objetivo profissional", "Ex.: participar de reuniões e entrevistas em inglês, trabalhar em time internacional")}
        </fieldset>

        <fieldset className="fs">
          <legend>Seus interesses</legend>
          {text("movies", "Filmes", "Gêneros e títulos: ficção científica, suspense, história...")}
          {text("series", "Séries", "Séries que você gosta ou já assistiu")}
          {text("animation", "Animes, desenhos e animações", "Universos que você já conhece bem")}
          {text("books", "Livros e leitura", "Gêneros e temas: mitologia, biografias, desenvolvimento pessoal...")}
          {text("music", "Músicas", "Estilos e artistas que você escuta")}
          {text("hobbies", "Hobbies", "O que você faz no tempo livre")}
          {text("pleasures", "Prazeres", "Pequenos prazeres do seu dia: café da manhã sem pressa, caminhada...")}
        </fieldset>

        <fieldset className="fs">
          <legend>Sua rotina</legend>
          <div className="row-3">
            <div className="field">
              <label htmlFor="pf-min">Minutos por dia</label>
              <input
                id="pf-min"
                type="number"
                min={5}
                max={120}
                value={p.minutesPerDay}
                onChange={(e) => set("minutesPerDay", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="pf-days">Dias por semana</label>
              <input
                id="pf-days"
                type="number"
                min={1}
                max={7}
                value={p.daysPerWeek}
                onChange={(e) => set("daysPerWeek", Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="pf-weeks">Semanas a gerar</label>
              <input
                id="pf-weeks"
                type="number"
                min={1}
                max={24}
                value={p.weeks}
                onChange={(e) => set("weeks", Number(e.target.value))}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="fs">
          <legend>Limites e observações</legend>
          {text("avoid", "O que evitar", "Ex.: nada de linguagem pesada; apenas músicas cristãs")}
          {text("notes", "Mais alguma coisa que eu deva saber", "Ex.: trabalho em turnos, estudo no ônibus, já tentei curso e parei")}
        </fieldset>

        {!ready && (
          <p className="tip">
            <b>Falta pouco: </b>
            preencha pelo menos três campos de objetivo ou interesse para o plano sair
            personalizado de verdade.
          </p>
        )}

        <div className="fc-actions">
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn primary"
            disabled={!ready}
            onClick={() => onGenerate(clampProfile(p))}
          >
            Salvar e gerar meu plano
          </button>
        </div>
      </div>
    </div>
  );
}
