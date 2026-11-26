import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { SITE_NAME, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: `As regras de uso do ${SITE_NAME}.`,
  alternates: { canonical: `${siteUrl()}/termos` },
};

export default function Page() {
  return (
    <LegalPage title="Termos de uso">
      <h1>Termos de uso</h1>
      <p>
        Ao usar o {SITE_NAME} ({siteUrl()}) você concorda com estes termos. Se não concordar, não use o app.
      </p>

      <h2>1. O que é o app</h2>
      <p>
        Uma ferramenta gratuita de estudo de inglês: plano semanal, vocabulário, lições e exercícios gerados por
        inteligência artificial, e lembretes na Google Agenda.
      </p>

      <h2>2. Acesso</h2>
      <p>
        Algumas funções pedem login com o Google e podem estar liberadas só para contas autorizadas. Você é
        responsável pela sua conta e pelo uso que faz dela.
      </p>

      <h2>3. Conteúdo gerado por IA</h2>
      <p>
        Explicações, exemplos, pronúncias aproximadas e correções são gerados por IA e podem ter erros. Use-os como
        apoio ao estudo, não como fonte oficial.
      </p>

      <h2>4. Uso aceitável</h2>
      <p>
        Não use o app para enviar conteúdo ilegal ou ofensivo, para tentar acessar dados de outras pessoas ou para
        sobrecarregar o serviço. Se você usar a sua própria chave da API do Gemini, os custos e os limites dela são
        seus.
      </p>

      <h2>5. Google Agenda</h2>
      <p>
        O app só cria, atualiza e remove os eventos que ele mesmo cria, e só quando você pede. Você pode tirar essa
        permissão quando quiser na sua conta Google.
      </p>

      <h2>6. Disponibilidade</h2>
      <p>
        O app é oferecido como está, sem garantia de funcionamento contínuo. Ele pode mudar, ficar fora do ar ou ser
        encerrado. Na medida permitida pela lei, não nos responsabilizamos por perdas decorrentes do uso.
      </p>

      <h2>7. Privacidade</h2>
      <p>
        O tratamento dos seus dados está na <Link href="/privacidade">Política de privacidade</Link>.
      </p>

      <h2>8. Mudanças e lei aplicável</h2>
      <p>
        Estes termos podem mudar; a data no topo indica a versão em vigor. Valem as leis do Brasil.
      </p>

      <h2>9. Contato</h2>
      <p>
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
