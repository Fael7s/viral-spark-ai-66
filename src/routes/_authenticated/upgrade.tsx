import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Crown, Check, Sparkles, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createCheckoutSession } from "@/lib/billing.functions";
import { ERROR_MESSAGES } from "@/lib/generate.server";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade para o Pro — ViralCaption" },
      {
        name: "description",
        content:
          "Assine o plano Pro do ViralCaption e gere até 500 conteúdos virais por dia, com todos os tons e prioridade.",
      },
    ],
  }),
  component: UpgradePage,
});

const BENEFITS = [
  "500 gerações por dia (100x o plano gratuito)",
  "Todos os tons, incluindo Provocativo e Luxo",
  "Prioridade na geração de conteúdo",
  "Histórico e favoritos ilimitados",
];

function UpgradePage() {
  const checkout = useServerFn(createCheckoutSession);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { url } = await checkout();
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("ALREADY_PRO")) {
        toast.info("Você já é Pro!");
        setLoading(false);
        return;
      }
      const key = Object.keys(ERROR_MESSAGES).find((k) => msg.includes(k));
      toast.error(
        key ? ERROR_MESSAGES[key] : "Não foi possível iniciar o checkout. Tente novamente em instantes.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand shadow-glow">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </span>
          <h1 className="text-3xl font-bold">Desbloqueie o ViralCaption Pro</h1>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Crie sem limites e leve seus vídeos ao próximo nível.
          </p>
        </div>

        <Card className="border-primary/40 bg-card/80 p-8">
          <div className="mb-6 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold">Pro</span>
            <span className="text-muted-foreground">assinatura mensal</span>
          </div>

          <div className="mb-6 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-gradient">{PRICE_DISPLAY}</span>
            <span className="text-sm text-muted-foreground">/mês</span>
          </div>



          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </span>
                <span className="text-sm">{b}</span>
              </li>
            ))}
          </ul>

          <Button
            className="mt-8 w-full gap-2 bg-brand text-primary-foreground hover:opacity-90"
            disabled={loading}
            onClick={handleSubscribe}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Redirecionando..." : "Assinar agora"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Pagamento seguro processado pelo Stripe. Cancele quando quiser.
          </p>
        </Card>
      </main>
    </div>
  );
}
