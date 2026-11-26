import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { SITE_NAME, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: `Quais dados o ${SITE_NAME} usa, para quê, com quem compartilha e como pedir a exclusão.`,
  alternates: { canonical: `${siteUrl()}/privacidade` },
};

const email = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;

export default function Page() {
  return (
    <LegalPage title="Política de privacidade">
      <h1>Política de privacidade</h1>
      <p>
        O {SITE_NAME} ({siteUrl()}) é um app gratuito para estudar inglês com um plano semanal, lições e
        exercícios gerados por inteligência artificial. Esta página explica quais dados ele usa, para quê, com
        quem compartilha e como você pode pedir a exclusão. Responsável e contato: {email}.
      </p>

      <h2>1. Dados que coletamos</h2>
      <h3>Da sua conta Google (quando você entra com o Google)</h3>
      <ul>
        <li>
          <strong>Nome, e-mail e foto do perfil</strong> — para identificar a sua conta e mostrar quem está
          conectado.
        </li>
        <li>
          <strong>Tokens de acesso do Google</strong> — guardados no nosso banco de dados, só para o app agir na
          sua Google Agenda quando você pede.
        </li>
        <li>
          <strong>Google Agenda (permissão “calendar.events”)</strong> — usada só para{" "}
          <strong>criar, atualizar e remover os eventos que o próprio app cria</strong>: o lembrete diário de
          estudo e, se você exportar, as atividades do plano. O app <strong>não lê, não guarda e não analisa</strong>{" "}
          os seus outros compromissos.
        </li>
      </ul>
      <h3>Do seu estudo</h3>
      <ul>
        <li>O perfil de estudo que você preenche (nível, objetivos, dificuldades, interesses e, se quiser, um nome).</li>
        <li>O plano gerado, o progresso, as palavras do vocabulário e as anotações.</li>
        <li>As lições, as suas respostas aos exercícios, as correções e as perguntas feitas ao “professor”.</li>
        <li>O horário do lembrete diário e o registro das exportações para a agenda.</li>
      </ul>
      <h3>No seu navegador</h3>
      <p>
        Um cookie de sessão mantém você conectado. O progresso, as anotações, a chave da API do Gemini (se você
        informar a sua) e o código de acesso ficam no armazenamento local do navegador. O app não usa cookies de
        publicidade nem ferramentas de análise ou rastreamento.
      </p>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Montar o seu plano, as lições e os exercícios e guardar o seu progresso entre aparelhos.</li>
        <li>Criar na sua Google Agenda os eventos que você pediu.</li>
        <li>Permitir o acesso só às contas autorizadas.</li>
      </ul>
      <p>Não vendemos, não alugamos e não usamos os seus dados para publicidade.</p>

      <h2>3. Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>Google Gemini (IA)</strong> — recebe o texto necessário para gerar o conteúdo: o perfil de estudo,
          o tema da semana, as suas respostas e as suas perguntas. Não enviamos à IA o seu e-mail, os tokens nem os
          seus eventos da agenda.
        </li>
        <li>
          <strong>Supabase</strong> (banco de dados) e <strong>Vercel</strong> (hospedagem) — guardam e servem os
          dados para o app funcionar.
        </li>
        <li>Autoridades, só quando a lei exigir.</li>
      </ul>

      <h2>4. Uso dos dados recebidos das APIs do Google</h2>
      <p>
        O uso e a transferência, para qualquer outro app, de informações recebidas das APIs do Google seguem a{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener noreferrer" target="_blank">
          Política de Dados do Usuário dos Serviços de API do Google
        </a>
        , incluindo os requisitos de Uso Limitado. Os dados do Google são usados só para as funções descritas
        acima, não são transferidos a terceiros (exceto para prestar essas funções, cumprir a lei ou em caso de
        fusão ou aquisição), não são usados para publicidade e não são lidos por pessoas, exceto com o seu
        consentimento, por segurança ou por exigência legal.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Enquanto a sua conta existir. Quando você pede a exclusão, apagamos a conta e todos os dados ligados a ela
        em até 30 dias.
      </p>

      <h2>6. Seus direitos e como excluir os dados</h2>
      <p>
        Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir acesso, correção, cópia ou exclusão dos seus
        dados e revogar o consentimento. Para isso, escreva para {email}.
      </p>
      <p>
        Você também pode tirar o acesso do app à sua conta Google a qualquer momento em{" "}
        <a href="https://myaccount.google.com/permissions" rel="noopener noreferrer" target="_blank">
          myaccount.google.com/permissions
        </a>
        . Os eventos já criados na agenda continuam lá até você apagá-los.
      </p>

      <h2>7. Segurança</h2>
      <p>
        A comunicação usa HTTPS, o banco de dados só é acessado pelo servidor do app e cada pessoa só consegue ler
        e alterar os próprios dados.
      </p>

      <h2>8. Crianças</h2>
      <p>O app não é voltado a menores de 13 anos e não coleta dados deles de propósito.</p>

      <h2>9. Mudanças nesta política</h2>
      <p>
        Quando esta política mudar, a data no topo da página é atualizada. Mudanças importantes são avisadas no
        app.
      </p>

      <h2>10. Contato</h2>
      <p>Dúvidas ou pedidos sobre os seus dados: {email}.</p>
    </LegalPage>
  );
}
