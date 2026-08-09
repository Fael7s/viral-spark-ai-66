import type { Platform } from "@/lib/types";

/**
 * Exemplos escritos a mao, usados apenas como vitrine na landing page.
 *
 * Nao sao geracoes ao vivo e nao passam pelo servidor: a interface rotula cada
 * bloco como exemplo justamente para nao sugerir que um visitante anonimo esta
 * vendo o modelo rodar. Geracao real exige conta e acontece em /app.
 */
export interface ShowcaseExample {
  id: string;
  /** Rotulo do contexto do video, mostrado acima do par antes/depois. */
  contexto: string;
  plataforma: Platform;
  /** O que a pessoa normalmente escreveria sozinha. */
  antes: string;
  depois: {
    gancho: string;
    legenda: string;
    hashtags: string[];
  };
}

export const HERO_EXAMPLES: ShowcaseExample[] = [
  {
    id: "loja-novidade",
    contexto: "Loja avisando que chegou coleção nova",
    plataforma: "reels",
    antes: "Novidade na loja",
    depois: {
      gancho: "Chegou a peça que vai sumir primeiro. Sempre some primeiro.",
      legenda:
        "Coleção nova na loja e a gente já sabe qual acaba antes. Passa aqui antes do fim de semana que ainda tem numeração.",
      hashtags: ["#lojadebairro", "#coleçãonova", "#modafeminina", "#achadinhos"],
    },
  },
  {
    id: "croissant",
    contexto: "Vídeo do croissant saindo do forno",
    plataforma: "tiktok",
    antes: "vídeo de croissant saindo do forno",
    depois: {
      gancho: "O som que esse croissant faz às 6h da manhã não é normal.",
      legenda:
        "Massa folhada leva três dias pra ficar assim. Você come em quatro mordidas. É justo? Não. É bom? Muito.",
      hashtags: ["#padariaartesanal", "#croissant", "#comidadeverdade", "#asmr"],
    },
  },
  {
    id: "personal-treino",
    contexto: "Personal explicando erro de treino",
    plataforma: "shorts",
    antes: "dicas de treino para iniciantes",
    depois: {
      gancho: "Você não está estagnado. Você está treinando pesado do jeito errado.",
      legenda:
        "Três séries até a falha não valem nada se a execução quebra na segunda repetição. Corrige isso primeiro, o peso vem depois.",
      hashtags: ["#treinodeforça", "#personaltrainer", "#academia", "#hipertrofia"],
    },
  },
];

/** Exemplos por nicho, usados na seção de nichos da landing page. */
export const NICHE_EXAMPLES: ShowcaseExample[] = [
  {
    id: "loja-de-roupa",
    contexto: "Loja de roupa",
    plataforma: "reels",
    antes: "promoção de inverno com 30% off",
    depois: {
      gancho: "Trinta por cento off é bom. Acabar a numeração 38 é o que sempre acontece.",
      legenda:
        "Inverno com desconto até domingo. A gente avisa por aqui quando a numeração começa a fechar, então fica de olho.",
      hashtags: ["#modainverno", "#promoção", "#lojaderoupa", "#lookdodia"],
    },
  },
  {
    id: "barbearia",
    contexto: "Barbearia",
    plataforma: "tiktok",
    antes: "corte degradê feito hoje na barbearia",
    depois: {
      gancho: "Ele entrou dizendo que qualquer corte servia. Saiu marcando o próximo.",
      legenda:
        "Degradê fechado com navalha e barba alinhada. Quarenta minutos na cadeira, duas semanas de gente perguntando onde você cortou.",
      hashtags: ["#barbearia", "#degradê", "#cortemasculino", "#barba"],
    },
  },
  {
    id: "food-truck",
    contexto: "Food truck",
    plataforma: "reels",
    antes: "hoje estamos na praça até as 23h",
    depois: {
      gancho: "A fila do food truck começa 19h. A gente abre 18h por um motivo.",
      legenda:
        "Hoje na praça até 23h ou até o pão acabar, o que vier primeiro. Spoiler: normalmente o pão vem primeiro.",
      hashtags: ["#foodtruck", "#comidaderua", "#hambúrguerartesanal", "#jantar"],
    },
  },
];
