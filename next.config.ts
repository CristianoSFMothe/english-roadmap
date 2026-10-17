import type { NextConfig } from "next";

/**
 * O app usa uma rota de servidor (app/api/plan) para chamar a API da Anthropic
 * com a chave guardada em variável de ambiente, por isso não é mais um export estático.
 */
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
