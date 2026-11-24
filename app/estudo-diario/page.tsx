import type { Metadata } from "next";
import DailyStudyPage from "@/components/DailyStudyPage";
import { sampleRawWeeks } from "@/lib/content";
import { authConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Estudo do dia: teoria, dicas e exercícios de inglês",
  description:
    "Todo dia, uma explicação curta em português, dicas para não errar e 5 exercícios de inglês sobre o assunto da semana do seu plano.",
  alternates: { canonical: "/estudo-diario" },
};

export default function Page() {
  return <DailyStudyPage sample={sampleRawWeeks} authEnabled={authConfigured} />;
}
