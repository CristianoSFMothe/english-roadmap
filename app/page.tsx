import Roadmap from "@/components/Roadmap";
import { sampleRawWeeks } from "@/lib/content";

export default function Home() {
  return <Roadmap sample={sampleRawWeeks} />;
}
