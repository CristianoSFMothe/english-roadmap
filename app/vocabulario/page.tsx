import type { Metadata } from "next";
import VocabularyPage from "@/components/VocabularyPage";
import { sampleRawWeeks } from "@/lib/content";
import { authConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Vocabulário de inglês: alfabeto, números, verbos e expressões",
  description:
    "Alfabeto em inglês com pronúncia aproximada, números de 0 a 1 milhão, dias da semana, meses, família, verbos mais usados e expressões do dia a dia, com áudio e flashcards. Guarde também as suas próprias palavras e frases.",
  alternates: { canonical: "/vocabulario" },
};

export default function Page() {
  return <VocabularyPage sample={sampleRawWeeks} authEnabled={authConfigured} />;
}
