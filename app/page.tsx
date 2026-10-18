import Roadmap from "@/components/Roadmap";
import { sampleRawWeeks } from "@/lib/content";
import { authConfigured } from "@/lib/auth";

export default function Home() {
  return <Roadmap sample={sampleRawWeeks} authEnabled={authConfigured} />;
}
