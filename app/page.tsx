import Roadmap from "@/components/Roadmap";
import { sampleRawWeeks } from "@/lib/content";
import { authConfigured } from "@/lib/auth";

// Lida a cada requisição: assim mudar as variáveis de ambiente passa a valer
// sem depender do que existia no momento do build.
export const dynamic = "force-dynamic";

export default function Home() {
  return <Roadmap sample={sampleRawWeeks} authEnabled={authConfigured} />;
}
