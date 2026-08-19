import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection, SupportMailto } from "@/components/legal-page";
import { VENDOR } from "@/lib/vendor";

export const Route = createFileRoute("/privacidade")({
  component: Privacidade,
});

function Privacidade() {
  return (
    <LegalPage title="Política de Privacidade">
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Esta política descreve como os dados pessoais dos usuários do ViralCaption são tratados, nos
        termos da Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018).
      </p>

      <LegalSection title="1. Controlador dos dados">
        <p>
          O controlador dos dados pessoais tratados no ViralCaption é{" "}
          <strong className="text-foreground">{VENDOR.nome}</strong>, pessoa física inscrita no CPF
          sob o número <strong className="text-foreground">{VENDOR.cpf}</strong>.
        </p>
        <p>
          Contato do controlador: <SupportMailto />.
        </p>
      </LegalSection>

      <LegalSection title="2. Dados tratados">
        <p>
          <strong className="text-foreground">Dados de cadastro e autenticação:</strong> endereço de
          e-mail e identificadores de sessão. Se você optar por entrar com uma conta Google, Apple
          ou Microsoft, recebemos desses provedores apenas os dados básicos de identificação
          necessários para criar e vincular a sua conta.
        </p>
        <p>
          <strong className="text-foreground">Conteúdo de uso:</strong> os textos que você envia
          para geração, as sugestões produzidas, o histórico e os itens marcados como favoritos.
        </p>
        <p>
          <strong className="text-foreground">Dados de pagamento:</strong> tratados diretamente pela
          Stripe. O fornecedor não coleta nem armazena números de cartão. Recebemos da Stripe apenas
          os identificadores de cliente e de assinatura e o status do pagamento.
        </p>
        <p>
          <strong className="text-foreground">Dados técnicos:</strong> registros de acesso e de
          erro, incluindo endereço IP, necessários para segurança, prevenção a abusos e cumprimento
          do artigo 15 do Marco Civil da Internet.
        </p>
      </LegalSection>

      <LegalSection title="3. Finalidades e bases legais">
        <p>
          Executar o contrato e fornecer o serviço, incluindo autenticação, geração de conteúdo,
          histórico, favoritos e cobrança da assinatura: execução de contrato, artigo 7, inciso V,
          da LGPD.
        </p>
        <p>
          Cumprir obrigações legais e regulatórias, inclusive a guarda de registros de acesso:
          artigo 7, inciso II, da LGPD.
        </p>
        <p>
          Garantir a segurança do serviço, prevenir fraudes e abusos e corrigir falhas: legítimo
          interesse, artigo 7, inciso IX, da LGPD, sempre limitado ao estritamente necessário.
        </p>
      </LegalSection>

      <LegalSection title="4. Compartilhamento com terceiros">
        <p>
          Os dados são compartilhados apenas com operadores necessários ao funcionamento do serviço,
          e somente na medida necessária:
        </p>
        <p>
          <strong className="text-foreground">Lovable Cloud e Supabase:</strong> hospedagem da
          aplicação, autenticação e banco de dados.
        </p>
        <p>
          <strong className="text-foreground">Lovable AI Gateway:</strong> encaminha o texto enviado
          para geração ao modelo de inteligência artificial Google Gemini, que produz as sugestões.
          Evite incluir dados pessoais ou informações sigilosas nos textos que enviar para geração.
        </p>
        <p>
          <strong className="text-foreground">Stripe:</strong> processamento de pagamentos, estornos
          e gestão da assinatura.
        </p>
        <p>
          <strong className="text-foreground">Google Fonts:</strong> as fontes tipográficas do site
          são entregues por esse serviço, que recebe o endereço IP necessário para a entrega do
          arquivo.
        </p>
        <p>Os dados não são vendidos, alugados nem cedidos para fins publicitários de terceiros.</p>
      </LegalSection>

      <LegalSection title="5. Transferência internacional">
        <p>
          Os operadores acima podem processar dados em servidores localizados fora do Brasil.
          Especificamente, seus dados pessoais são armazenados e processados em servidores
          localizados nos Estados Unidos, operados pela Supabase Inc. sobre infraestrutura da Amazon
          Web Services. Essas transferências ocorrem nos termos do Capítulo V da LGPD, amparadas em
          cláusulas contratuais e garantias oferecidas por esses fornecedores, nos termos do art.
          33, inciso II, da Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
      </LegalSection>

      <LegalSection title="6. Retenção e eliminação">
        <p>
          Os dados de conta e o conteúdo gerado são mantidos enquanto a conta existir. Encerrada a
          conta, são eliminados ou anonimizados, ressalvados os registros cuja guarda seja exigida
          por lei e os dados necessários ao cumprimento de obrigações fiscais relativas às
          assinaturas contratadas.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies">
        <p>
          O site utiliza <strong className="text-foreground">apenas cookies essenciais</strong>: o
          cookie de sessão que mantém você autenticado e um cookie de preferência de interface, que
          apenas guarda o estado visual da navegação.
        </p>
        <p>
          O site{" "}
          <strong className="text-foreground">
            não utiliza cookies de analytics, de publicidade, de rastreamento ou de marketing
          </strong>
          , e não carrega scripts de terceiros com essa finalidade. Como não há cookies não
          essenciais, não existe consentimento a ser recusado para essa finalidade. Caso isso mude,
          esta política será atualizada previamente e será oferecida a opção de recusa dos cookies
          não essenciais.
        </p>
      </LegalSection>

      <LegalSection title="8. Direitos do titular">
        <p>
          Nos termos do artigo 18 da LGPD, você pode solicitar a confirmação da existência de
          tratamento, o acesso aos seus dados, a correção de dados incompletos ou desatualizados, a
          anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desacordo
          com a lei, a portabilidade, a informação sobre compartilhamentos e a revogação do
          consentimento, quando aplicável.
        </p>
        <p>
          Para exercer qualquer um desses direitos, escreva para <SupportMailto />. O pedido é
          atendido gratuitamente e você não precisa justificar o motivo da solicitação.
        </p>
      </LegalSection>

      <LegalSection title="9. Segurança">
        <p>
          São adotadas medidas técnicas e administrativas para proteger os dados, incluindo tráfego
          criptografado, controle de acesso ao banco de dados e verificação de assinatura nas
          integrações de pagamento. Incidentes de segurança relevantes serão comunicados aos
          titulares afetados e à Autoridade Nacional de Proteção de Dados, conforme o artigo 48 da
          LGPD.
        </p>
      </LegalSection>

      <LegalSection title="10. Encarregado pelo tratamento de dados">
        <p>
          O encarregado pelo tratamento de dados pessoais é {VENDOR.nome}, que pode ser contatado
          pelo e-mail <SupportMailto />.
        </p>
      </LegalSection>

      <LegalSection title="11. Alterações desta política">
        <p>
          Alterações relevantes serão comunicadas por e-mail ou por aviso no site antes de entrarem
          em vigor.
        </p>
        <p>Data de publicação desta política: {VENDOR.dataPublicacao}.</p>
      </LegalSection>
    </LegalPage>
  );
}
