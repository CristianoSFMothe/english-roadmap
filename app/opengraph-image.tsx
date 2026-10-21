import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: plano de estudo de inglês personalizado com IA`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0d1016",
          color: "#e9ecf1",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34, color: "#9aa2b0" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#2b4fd0" }} />
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>
            Seu plano de inglês, semana a semana, no seu ritmo
          </div>
          <div style={{ fontSize: 32, color: "#9aa2b0" }}>
            Gramática, vocabulário, flashcards e atividades diárias montados pela IA a partir
            do seu nível e dos seus interesses.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 28, color: "#7a9fff" }}>
          A1 → A2 → B1 → B2 → C1
        </div>
      </div>
    ),
    size,
  );
}
