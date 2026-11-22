import Roadmap from "@/components/Roadmap";
import { sampleRawWeeks } from "@/lib/content";
import { authConfigured } from "@/lib/auth";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: siteUrl(),
  description: SITE_DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  inLanguage: "pt-BR",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
  teaches: "Língua inglesa",
  educationalLevel: "A1 a C1 (Quadro Europeu Comum de Referência)",
};

// Lida a cada requisição: assim mudar as variáveis de ambiente passa a valer
// sem depender do que existia no momento do build.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Roadmap sample={sampleRawWeeks} authEnabled={authConfigured} />
    </>
  );
}
