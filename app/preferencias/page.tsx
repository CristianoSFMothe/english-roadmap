import type { Metadata } from "next";
import PreferencesPage from "@/components/PreferencesPage";

export const metadata: Metadata = {
  title: "Preferências e permissões",
  description: "Microfone, voz da pronúncia, localização e acesso ao Google Agenda.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PreferencesPage />;
}
