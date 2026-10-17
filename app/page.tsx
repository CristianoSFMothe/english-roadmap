import Roadmap from "@/components/Roadmap";
import { weeks, TOTAL_CARDS, TOTAL_DAYS, TOTAL_MINUTES } from "@/lib/content";

export default function Home() {
  return (
    <Roadmap
      weeks={weeks}
      totals={{ days: TOTAL_DAYS, cards: TOTAL_CARDS, minutes: TOTAL_MINUTES }}
    />
  );
}
