import type { Metadata } from "next";
import WeekLessonPage from "@/components/WeekLessonPage";
import { sampleRawWeeks } from "@/lib/content";
import { authConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Lição da semana",
  robots: { index: false },
};

export default async function Page({ params }: { params: Promise<{ semana: string }> }) {
  const { semana } = await params;
  return <WeekLessonPage sample={sampleRawWeeks} authEnabled={authConfigured} semana={semana} />;
}
