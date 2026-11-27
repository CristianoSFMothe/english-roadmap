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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ data?: string | string[] }>;
}) {
  const { data } = await searchParams;
  const dataInicial = (Array.isArray(data) ? data[0] : data) ?? null;
  return <DailyStudyPage sample={sampleRawWeeks} authEnabled={authConfigured} dataInicial={dataInicial} />;
}
