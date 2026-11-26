import type { Metadata } from "next";
import LessonsIndexPage from "@/components/LessonsIndexPage";
import { sampleRawWeeks } from "@/lib/content";
import { authConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Lições",
  description: "A aula completa de cada semana do plano, em 6 partes, com um professor para tirar dúvidas.",
  robots: { index: false },
};

export default function Page() {
  return <LessonsIndexPage sample={sampleRawWeeks} authEnabled={authConfigured} />;
}
