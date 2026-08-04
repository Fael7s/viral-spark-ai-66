// Dados de identificação do fornecedor, exibidos publicamente no site e nas
// páginas legais. Fonte única de verdade: alterar aqui reflete em todas as
// páginas que identificam o fornecedor, o controlador de dados e o contato.

export const VENDOR = {
  /** Fornecedor pessoa física. */
  nome: "Rafael Oliveira Teixeira",
  cpf: "167.320.166-01",
  emailSuporte: "rafaelteixeiradev2@gmail.com",
  comarcaForo: "Juiz de Fora, MG",
  /** Garantia comercial, adicional ao direito legal de arrependimento. */
  prazoGarantiaSatisfacao: "15 dias corridos",
  /** Aviso prévio mínimo para alteração de preço de assinatura vigente. */
  prazoAvisoMudancaPreco: "30 dias",
  /**
   * SLA comercial de resposta a solicitações recebidas pelo e-mail de suporte.
   * Não se aplica ao artigo 49 do CDC, cuja devolução é de imediato, nem aos
   * pedidos de titulares sob a LGPD, que seguem os prazos da própria lei.
   */
  prazoRespostaSuporte: "5 dias úteis",
  dataPublicacao: "02/08/2026",
} as const;
