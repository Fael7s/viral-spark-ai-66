import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Mail } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ExamplePair, ExampleSwitcher, PhoneMockup } from "@/components/showcase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HERO_EXAMPLES, NICHE_EXAMPLES } from "@/lib/examples";
import { VENDOR } from "@/lib/vendor";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero: copy a esquerda, exemplos do produto a direita. */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="max-w-xl">
            <h1 className="text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
              O gancho que segura nos 3 primeiros segundos.
            </h1>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
              Você descreve o vídeo. Sai o gancho, a legenda e as hashtags prontos para colar no
              TikTok, no Reels e no Shorts.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                <Link to="/auth">
                  Criar minha conta <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                Sem cartão de crédito, sem pegadinha
              </span>
            </div>

            <ul className="mt-10 space-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
              <li>Gancho, legenda, emoji e hashtag saem juntos, na mesma tela.</li>
              <li>Hashtag que não flopa: mistura de nicho com alcance, não só as genéricas.</li>
              <li>O que funcionou você favorita e reusa na semana seguinte.</li>
            </ul>
          </div>

          <div className="lg:pt-2">
            <ExampleSwitcher examples={HERO_EXAMPLES} />
          </div>
        </div>
      </section>

      {/* A tela de geração, no lugar dos cartões numerados de "como funciona". */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold leading-tight">É uma tela só</h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Escolhe a rede, escolhe o tom, escreve o tema do vídeo. Se tiver o roteiro, cola junto
              — o resultado fica mais perto do que você ia falar mesmo.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              O que volta já vem separado por tipo, com botão de copiar em cada bloco. Nada de
              exportar, formatar ou limpar antes de postar.
            </p>
            <Button asChild variant="secondary" className="mt-7 gap-2">
              <Link to="/auth">
                Ver a tela por dentro <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <PhoneMockup>
            {/* TODO: substituir por screenshot real */}
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="rounded-sm border border-dashed border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Placeholder
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Screenshot da tela de geração entra aqui.
              </p>
            </div>
          </PhoneMockup>
        </div>
      </section>

      {/* Exemplos por nicho. */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 lg:py-24">
          <h2 className="text-3xl font-bold">Como fica em cada nicho</h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Três exemplos escritos para esta página. Não são resultados de clientes e não foram
            gerados agora — servem para você ver o formato antes de criar conta.
          </p>

          <div className="mt-12 space-y-12">
            {NICHE_EXAMPLES.map((example) => (
              <ExamplePair key={example.id} example={example} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing: valores e itens de plano inalterados, só a apresentação mudou. */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-16 lg:py-24">
          <h2 className="text-3xl font-bold">Planos</h2>
          <p className="mt-4 text-muted-foreground">
            Começa de graça. Se travar no limite diário, aí sim vale pagar.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Card className="border-border bg-card p-7">
              <h3 className="text-xl font-bold">Free</h3>
              <p className="mt-1 text-sm text-muted-foreground">Para começar a testar</p>
              <p className="mt-5 text-4xl font-bold">
                R$0<span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="mt-7 space-y-3 text-sm">
                {["5 gerações por dia", "4 tons de conteúdo", "Histórico e favoritos"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="secondary" className="mt-8 w-full">
                <Link to="/auth">Criar conta grátis</Link>
              </Button>
            </Card>

            <Card className="relative border-primary bg-card p-7">
              <Badge className="absolute -top-3 left-7 rounded-sm bg-primary text-primary-foreground">
                Mais popular
              </Badge>
              <h3 className="text-xl font-bold">Pro</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Para criadores em ritmo acelerado
              </p>
              <p className="mt-5 text-4xl font-bold">
                R$29,90<span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="mt-7 space-y-3 text-sm">
                {[
                  "500 gerações por dia",
                  "Todos os tons e estilos",
                  "Prioridade na fila de geração",
                  "Histórico e favoritos ilimitados",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/auth">Assinar o Pro</Link>
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Cria a conta primeiro, a assinatura fecha no passo seguinte
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Sobre: sem depoimento, sem número inventado, sem foto. */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-16 lg:py-24">
          <h2 className="text-3xl font-bold">Quem faz isso aqui</h2>
          <p className="mt-6 leading-relaxed text-muted-foreground">
            O ViralCaption é tocado por um desenvolvedor solo. Sem equipe, sem venture capital, sem
            escritório. O produto é novo e não tem base de clientes para exibir aqui — por isso você
            não vai encontrar depoimento nem contador de usuários nesta página.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Se você mandar um e-mail, quem lê e responde é a mesma pessoa que escreveu o código.
            Suporte, cancelamento e reembolso saem todos por esse endereço.
          </p>
          <Button asChild variant="secondary" className="mt-7 gap-2">
            <a href={`mailto:${VENDOR.emailSuporte}`}>
              <Mail className="h-4 w-4" />
              {VENDOR.emailSuporte}
            </a>
          </Button>
        </div>
      </section>

      {/* Fechamento. */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold">Testa com o próximo vídeo que você for postar</h2>
        <p className="mx-auto mt-5 max-w-md text-muted-foreground">
          São cinco gerações por dia no plano grátis. Dá para saber se serve antes de gastar
          qualquer coisa.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Link to="/auth">
            Criar minha conta <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} ViralCaption</p>
        <p className="mt-3">
          {VENDOR.nome} — CPF {VENDOR.cpf}
        </p>
        <p className="mt-1">
          <a
            href={`mailto:${VENDOR.emailSuporte}`}
            className="text-primary underline underline-offset-4 hover:opacity-80"
          >
            {VENDOR.emailSuporte}
          </a>
        </p>
        <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link to="/termos" className="hover:text-foreground">
            Termos de Uso
          </Link>
          <Link to="/privacidade" className="hover:text-foreground">
            Política de Privacidade
          </Link>
          <Link to="/reembolso" className="hover:text-foreground">
            Política de Reembolso
          </Link>
        </nav>
      </footer>
    </div>
  );
}
