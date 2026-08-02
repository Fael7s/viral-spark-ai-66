import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection, SupportMailto } from "@/components/legal-page";
import { VENDOR } from "@/lib/vendor";

export const Route = createFileRoute("/reembolso")({
  component: Reembolso,
});

function Reembolso() {
  return (
    <LegalPage title="Política de Reembolso">
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Esta política descreve duas proteções distintas e cumulativas: o direito de arrependimento
        garantido por lei e a garantia de satisfação oferecida voluntariamente pelo fornecedor. A
        segunda é adicional à primeira e não a substitui, não a restringe e não a condiciona.
      </p>

      <LegalSection title="1. Direito de arrependimento (garantia legal)">
        <p>
          Nos termos do artigo 49 do Código de Defesa do Consumidor, por se tratar de contratação
          realizada fora do estabelecimento comercial, você pode desistir da contratação no prazo de{" "}
          <strong className="text-foreground">7 (sete) dias corridos</strong>, contados da data da
          contratação.
        </p>
        <p>
          O exercício desse direito não depende de justificativa, não depende de aprovação do
          fornecedor e não gera qualquer cobrança, multa, taxa de cancelamento ou retenção
          proporcional. Conforme o parágrafo único do artigo 49 do Código de Defesa do Consumidor,
          os valores eventualmente pagos são devolvidos de imediato e integralmente, monetariamente
          atualizados.
        </p>
        <p>
          Este é um direito legal indisponível: nenhuma disposição desta política, dos Termos de Uso
          ou de qualquer outro documento do site pode ser interpretada como limitação, condição ou
          renúncia a ele.
        </p>
      </LegalSection>

      <LegalSection title="2. Garantia de satisfação (política comercial do fornecedor)">
        <p>
          Sem prejuízo do direito de arrependimento previsto no artigo 49 do Código de Defesa do
          Consumidor, e de forma adicional a ele, o fornecedor oferece uma garantia de satisfação de{" "}
          <strong className="text-foreground">{VENDOR.prazoGarantiaSatisfacao}</strong>, contados da
          data da contratação.
        </p>
        <p>
          Dentro desse prazo, você pode solicitar a devolução integral do valor pago, sem
          necessidade de apresentar justificativa e sem qualquer taxa de cancelamento, retenção
          proporcional ou dedução por uso do serviço.
        </p>
        <p>
          Esta garantia é uma liberalidade contratual do fornecedor, concedida por prazo mais amplo
          que o legal. Ela amplia a proteção do consumidor e em nenhuma hipótese reduz, substitui ou
          condiciona o prazo de 7 dias corridos assegurado por lei.
        </p>
      </LegalSection>

      <LegalSection title="3. Como solicitar">
        <p>
          Envie um pedido para <SupportMailto />, a partir do endereço de e-mail usado na sua conta,
          informando que deseja o reembolso. Não é necessário explicar o motivo, nem em um caso nem
          no outro.
        </p>
        <p>
          Se a solicitação for enviada dentro dos 7 dias corridos, ela é tratada como exercício do
          direito de arrependimento do artigo 49 do Código de Defesa do Consumidor, com devolução de
          imediato, nos termos do parágrafo único daquele artigo. Se for enviada após esse prazo e
          dentro de {VENDOR.prazoGarantiaSatisfacao}, ela é tratada pela garantia de satisfação
          descrita no item 2, também com devolução integral.
        </p>
        <p>
          O fornecedor confirma o recebimento do pedido pelo mesmo e-mail e informa o encaminhamento
          do estorno. Nenhuma etapa adicional, formulário, ligação ou justificativa é exigida para
          que o reembolso seja processado.
        </p>
        <p>
          <strong className="text-foreground">Prazo de resposta:</strong> solicitações enviadas ao
          e-mail de suporte são respondidas em até{" "}
          <strong className="text-foreground">{VENDOR.prazoRespostaSuporte}</strong>. Esse prazo é
          um compromisso comercial de atendimento e{" "}
          <strong className="text-foreground">
            não condiciona nem posterga o direito de arrependimento
          </strong>
          : exercido o direito do artigo 49 do Código de Defesa do Consumidor dentro dos 7 dias
          corridos, a devolução é de imediato, independentemente do prazo de resposta do
          atendimento. O prazo de resposta descreve o atendimento da garantia de satisfação do item
          2.
        </p>
      </LegalSection>

      <LegalSection title="4. Como o estorno é processado">
        <p>
          O reembolso é processado pela Stripe, provedora de pagamentos do site, e devolvido sempre
          pelo{" "}
          <strong className="text-foreground">mesmo meio de pagamento utilizado na compra</strong>.
          Não são oferecidas nem exigidas formas alternativas, como crédito em conta ou cupom.
        </p>
        <p>
          Após o estorno ser emitido pela Stripe, o prazo para o valor aparecer na fatura ou na
          conta depende exclusivamente do emissor do cartão ou da instituição financeira, e foge ao
          controle do fornecedor.
        </p>
        <p>
          O acesso ao plano pago é encerrado quando o reembolso é processado, e a conta permanece
          disponível no plano gratuito.
        </p>
      </LegalSection>

      <LegalSection title="5. Fornecedor">
        <p>
          {VENDOR.nome}, inscrito no CPF sob o número {VENDOR.cpf}. Contato: <SupportMailto />.
        </p>
        <p>Data de publicação desta política: {VENDOR.dataPublicacao}.</p>
      </LegalSection>
    </LegalPage>
  );
}
