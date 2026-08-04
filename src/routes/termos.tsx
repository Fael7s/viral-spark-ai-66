import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection, SupportMailto } from "@/components/legal-page";
import { VENDOR } from "@/lib/vendor";

export const Route = createFileRoute("/termos")({
  component: Termos,
});

function Termos() {
  return (
    <LegalPage title="Termos de Uso">
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Estes Termos regulam o uso do ViralCaption, serviço que gera hooks, legendas, emojis e
        hashtags com apoio de inteligência artificial. O serviço é destinado a consumidores no
        Brasil e a relação é regida pelo Código de Defesa do Consumidor.
      </p>

      <LegalSection title="1. Identificação do fornecedor">
        <p>
          O ViralCaption é fornecido por <strong className="text-foreground">{VENDOR.nome}</strong>,
          pessoa física inscrita no CPF sob o número{" "}
          <strong className="text-foreground">{VENDOR.cpf}</strong>.
        </p>
        <p>
          Canal oficial de atendimento: <SupportMailto />.
        </p>
      </LegalSection>

      <LegalSection title="2. Objeto do serviço">
        <p>
          O serviço recebe uma descrição de vídeo ou roteiro fornecido por você e devolve sugestões
          de texto geradas por inteligência artificial. As sugestões são apoio criativo: não há
          garantia de desempenho, alcance, engajamento ou resultado comercial de qualquer natureza.
        </p>
        <p>
          Você é responsável por revisar o conteúdo antes de publicá-lo e por verificar sua
          adequação às regras das plataformas em que for utilizado.
        </p>
      </LegalSection>

      <LegalSection title="3. Cadastro e conta">
        <p>
          O uso exige criação de conta. Você se compromete a fornecer informações verdadeiras e a
          manter a confidencialidade das suas credenciais de acesso. A conta é pessoal e
          intransferível.
        </p>
        <p>Você pode encerrar sua conta a qualquer momento, solicitando pelo e-mail de suporte.</p>
      </LegalSection>

      <LegalSection title="4. Planos, preços e pagamento">
        <p>
          O plano gratuito permite um número limitado de gerações por dia, conforme informado na
          página inicial. O plano Pro é uma assinatura mensal, com renovação automática, cobrada
          pela Stripe, provedora de pagamentos contratada para esta finalidade.
        </p>
        <p>
          Os preços vigentes são os exibidos na página inicial no momento da contratação, em reais e
          com todos os tributos incluídos.
        </p>
        <p>
          Você pode cancelar a renovação automática a qualquer momento. O cancelamento interrompe as
          cobranças seguintes e o acesso ao plano pago permanece ativo até o fim do período já pago,
          sem multa ou taxa de cancelamento.
        </p>
      </LegalSection>

      <LegalSection title="5. Alteração de preços">
        <p>
          Eventuais alterações de preço da assinatura serão comunicadas a você por e-mail com
          antecedência mínima de{" "}
          <strong className="text-foreground">{VENDOR.prazoAvisoMudancaPreco}</strong> antes de
          passarem a valer para a sua assinatura.
        </p>
        <p>
          Se você não concordar com o novo valor, pode cancelar a renovação antes da data de
          vigência, sem qualquer ônus. O novo preço nunca é aplicado a um período já pago.
        </p>
      </LegalSection>

      <LegalSection title="6. Arrependimento e reembolso">
        <p>
          Você tem 7 dias corridos de arrependimento a contar da contratação, nos termos do artigo
          49 do Código de Defesa do Consumidor, com devolução integral e sem necessidade de
          justificativa. Adicionalmente, o fornecedor oferece garantia de satisfação de{" "}
          {VENDOR.prazoGarantiaSatisfacao}.
        </p>
        <p>
          As condições completas, incluindo o procedimento de solicitação, estão na{" "}
          <Link
            to="/reembolso"
            className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
          >
            Política de Reembolso
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Uso aceitável">
        <p>
          Não é permitido usar o serviço para produzir conteúdo ilícito, discriminatório, que viole
          direitos de terceiros, que configure fraude ou que descumpra as regras das plataformas de
          destino, nem tentar contornar limites técnicos, revender o acesso ou automatizar o uso de
          forma abusiva.
        </p>
        <p>
          O descumprimento pode levar à suspensão da conta. Havendo suspensão de conta com
          assinatura ativa, os valores proporcionais ao período não usufruído são devolvidos.
        </p>
      </LegalSection>

      <LegalSection title="8. Conteúdo gerado">
        <p>
          O texto que você envia continua sendo seu. As sugestões geradas a partir dele podem ser
          usadas livremente por você, inclusive comercialmente.
        </p>
        <p>
          Sistemas de inteligência artificial podem produzir resultados semelhantes para usuários
          diferentes, de modo que não é possível garantir exclusividade sobre as sugestões geradas.
        </p>
      </LegalSection>

      <LegalSection title="9. Disponibilidade">
        <p>
          O fornecedor empenha-se em manter o serviço disponível, mas podem ocorrer interrupções
          para manutenção ou por falhas de terceiros dos quais o serviço depende. Interrupções
          relevantes e prolongadas em plano pago dão direito ao abatimento proporcional do valor.
        </p>
      </LegalSection>

      <LegalSection title="10. Proteção de dados">
        <p>
          O tratamento de dados pessoais é descrito na{" "}
          <Link
            to="/privacidade"
            className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
          >
            Política de Privacidade
          </Link>
          , que integra estes Termos.
        </p>
      </LegalSection>

      <LegalSection title="11. Alterações destes Termos">
        <p>
          Alterações relevantes serão comunicadas por e-mail e passarão a valer a partir da data
          informada na comunicação. Se você não concordar, pode encerrar a conta antes dessa data,
          com devolução proporcional de valores já pagos e não usufruídos.
        </p>
      </LegalSection>

      <LegalSection title="12. Foro">
        <p>
          Fica eleito o foro da comarca de{" "}
          <strong className="text-foreground">{VENDOR.comarcaForo}</strong> para dirimir
          controvérsias decorrentes destes Termos, sem prejuízo do direito do consumidor de ajuizar
          a ação no foro do seu próprio domicílio, nos termos do artigo 101, inciso I, do Código de
          Defesa do Consumidor.
        </p>
        <p>Data de publicação destes Termos: {VENDOR.dataPublicacao}.</p>
      </LegalSection>
    </LegalPage>
  );
}
