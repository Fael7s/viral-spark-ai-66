import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Zap, Star, ArrowRight, Check, TrendingUp, Clock, Hash } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:pt-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, oklch(0.68 0.24 320 / 0.35), transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="mb-5 gap-1.5 border-primary/30 bg-primary/10 py-1.5 text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" /> Legendas virais com IA
          </Badge>
          <h1 className="text-balance text-4xl font-extrabold leading-tight sm:text-6xl">
            Escreva menos.
            <br />
            <span className="text-gradient">Viralize mais.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
            Descreva seu vídeo e receba em segundos hooks que prendem nos primeiros 3s, legendas
            otimizadas, emojis e hashtags — para TikTok, Reels e Shorts.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full gap-2 bg-brand text-primary-foreground hover:opacity-90 sm:w-auto"
            >
              <Link to="/auth">
                Gerar minha primeira legenda <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">Grátis • 5 gerações por dia</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Como funciona</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "1. Descreva",
              text: "Digite o tema do vídeo ou cole seu roteiro e escolha a plataforma e o tom.",
            },
            {
              icon: Sparkles,
              title: "2. Gere",
              text: "A IA cria hooks, legendas, emojis e hashtags adaptados a cada rede.",
            },
            {
              icon: TrendingUp,
              title: "3. Publique",
              text: "Copie com um clique, favorite os melhores e publique para engajar.",
            },
          ].map((s) => (
            <Card key={s.title} className="border-border/70 bg-card/60 p-6">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-soft">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature strip */}
      <section className="mx-auto max-w-5xl px-4 pb-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Clock, label: "Resultados em segundos" },
            { icon: Hash, label: "Hashtags de nicho + genéricas" },
            { icon: Star, label: "Salve seus favoritos" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-4 text-sm"
            >
              <f.icon className="h-5 w-5 text-accent" />
              {f.label}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Planos</h2>
        <p className="mt-2 text-center text-muted-foreground">Comece grátis, evolua quando quiser.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className="border-border/70 bg-card/60 p-7">
            <h3 className="text-xl font-bold">Free</h3>
            <p className="mt-1 text-sm text-muted-foreground">Para começar a testar</p>
            <p className="mt-4 text-4xl font-extrabold">
              R$0<span className="text-base font-normal text-muted-foreground">/mês</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {["5 gerações por dia", "4 tons de conteúdo", "Histórico e favoritos"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild variant="secondary" className="mt-7 w-full">
              <Link to="/auth">Começar grátis</Link>
            </Button>
          </Card>

          <Card className="relative border-primary/50 bg-card/80 p-7 shadow-glow">
            <Badge className="absolute -top-3 left-7 bg-brand text-primary-foreground">
              Mais popular
            </Badge>
            <h3 className="text-xl font-bold">Pro</h3>
            <p className="mt-1 text-sm text-muted-foreground">Para criadores em ritmo acelerado</p>
            <p className="mt-4 text-4xl font-extrabold">
              R$29<span className="text-base font-normal text-muted-foreground">/mês</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Gerações ilimitadas",
                "Todos os tons e estilos",
                "Prioridade na fila de geração",
                "Histórico e favoritos ilimitados",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Button
              asChild
              className="mt-7 w-full bg-brand text-primary-foreground hover:opacity-90"
            >
              <Link to="/auth">Assinar o Pro</Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* Testimonials (placeholder) */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Quem usa, aprova</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/70 bg-card/60 p-6">
              {/* TODO: substituir por depoimentos reais */}
              <div className="mb-3 flex gap-0.5 text-accent">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                “Depoimento de exemplo — economizei horas escrevendo legendas e meus vídeos passaram
                a reter muito mais.” (TODO)
              </p>
              <p className="mt-4 text-sm font-semibold">Criador(a) de conteúdo</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24">
        <Card className="mx-auto max-w-3xl overflow-hidden border-primary/40 bg-brand-soft p-10 text-center">
          <h2 className="text-3xl font-bold">Pronto para viralizar?</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Crie sua conta gratuita e gere suas primeiras legendas agora mesmo.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 gap-2 bg-brand text-primary-foreground hover:opacity-90"
          >
            <Link to="/auth">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ViralCaption. Feito para criadores.
      </footer>
    </div>
  );
}
