import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wand2, Sparkles, Star, Crown, AlertCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ResultCards, ResultCardsSkeleton } from "@/components/result-cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { generateContent } from "@/lib/generate.functions";
import { createBillingPortalSession } from "@/lib/billing.functions";
import { ERROR_MESSAGES } from "@/lib/generate.server";
import { fetchUsage, toggleFavorite } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { PLATFORMS, TONES, type GenerationResult, type Platform, type Tone } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/app")({
  component: GeneratePage,
});

function GeneratePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const generate = useServerFn(generateContent);
  const billingPortal = useServerFn(createBillingPortalSession);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { url } = await billingPortal();
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const key = Object.keys(ERROR_MESSAGES).find((k) => msg.includes(k));
      toast.error(key ? ERROR_MESSAGES[key] : "Não foi possível abrir o portal de assinatura.");
      setPortalLoading(false);
    }
  };

  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [tone, setTone] = useState<Tone>("engracado");
  const [topic, setTopic] = useState("");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<(GenerationResult & { id: string }) | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [limitHit, setLimitHit] = useState(false);

  const { data: usage } = useQuery({ queryKey: ["usage"], queryFn: fetchUsage });

  const mutation = useMutation({
    mutationFn: () => generate({ data: { platform, tone, topic, transcript } }),
    onSuccess: (data) => {
      setResult(data);
      setFavorited(false);
      setLimitHit(false);
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (err: Error) => {
      if (err.message.includes("LIMIT_REACHED")) {
        setLimitHit(true);
        toast.error("Limite diário atingido.");
        queryClient.invalidateQueries({ queryKey: ["usage"] });
        return;
      }
      const key = Object.keys(ERROR_MESSAGES).find((k) => err.message.includes(k));
      toast.error(key ? ERROR_MESSAGES[key] : "Falha ao gerar. Tente novamente.");
    },
  });

  const handleFavorite = async () => {
    if (!result || !user) return;
    const next = !favorited;
    setFavorited(next);
    try {
      await toggleFavorite(user.id, result.id, next);
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(next ? "Adicionado aos favoritos!" : "Removido dos favoritos.");
    } catch {
      setFavorited(!next);
      toast.error("Não foi possível salvar o favorito.");
    }
  };

  const isPro = usage?.plan === "pro";
  const remaining = usage ? Math.max(0, usage.limit - usage.count) : null;
  const blocked = !isPro && remaining === 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Gerar conteúdo viral</h1>
            <p className="text-sm text-muted-foreground">
              Descreva seu vídeo e receba hooks, legendas, emojis e hashtags.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {usage ? (
              <Badge
                variant="secondary"
                className="gap-1.5 py-1.5"
                title="Gerações usadas hoje"
              >
                {isPro ? (
                  <>
                    <Crown className="h-3.5 w-3.5 text-primary" /> Pro
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> {remaining}/{usage.limit}{" "}
                    restantes hoje
                  </>
                )}
              </Badge>
            ) : null}
            {isPro ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={portalLoading}
                onClick={handleManageSubscription}
              >
                {portalLoading ? "Abrindo..." : "Gerenciar assinatura"}
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                className="gap-1.5 bg-brand text-primary-foreground hover:opacity-90"
              >
                <Link to="/upgrade">
                  <Crown className="h-3.5 w-3.5" /> Upgrade
                </Link>
              </Button>
            )}
          </div>
        </div>


        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Input panel */}
          <Card className="h-fit space-y-5 border-border/70 bg-card/80 p-5">
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPlatform(p.value)}
                    className={`rounded-lg border p-2 text-xs font-medium transition-colors ${
                      platform === p.value
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {PLATFORMS.find((p) => p.value === platform)?.hint}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tom</Label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => {
                  const locked = t.pro && !isPro;
                  return (
                    <button
                      key={t.value}
                      disabled={locked}
                      onClick={() => setTone(t.value)}
                      className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        tone === t.value
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                      } ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      {t.label}
                      {locked ? <Crown className="h-3 w-3 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Tema do vídeo</Label>
              <Input
                id="topic"
                value={topic}
                maxLength={400}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: 3 erros que travam seu crescimento no Instagram"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcript">Transcrição / roteiro (opcional)</Label>
              <Textarea
                id="transcript"
                value={transcript}
                maxLength={5000}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Cole aqui o roteiro ou a transcrição do vídeo para resultados mais precisos."
                rows={5}
              />
            </div>

            <Button
              className="w-full gap-2 bg-brand text-primary-foreground hover:opacity-90"
              disabled={mutation.isPending || topic.trim().length < 3 || blocked}
              onClick={() => mutation.mutate()}
            >
              <Wand2 className="h-4 w-4" />
              {mutation.isPending ? "Gerando..." : "Gerar"}
            </Button>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {(blocked || limitHit) && !mutation.isPending ? (
              <Card className="border-primary/40 bg-brand-soft p-6 text-center">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 text-primary" />
                <h3 className="text-lg font-bold">Você atingiu o limite diário</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  O plano gratuito inclui 5 gerações por dia. Faça upgrade para o Pro e gere sem
                  limites, com prioridade e todos os tons.
                </p>
                <Button asChild className="mt-5 gap-2 bg-brand text-primary-foreground hover:opacity-90">
                  <Link to="/upgrade">
                    <Crown className="h-4 w-4" /> Fazer upgrade para o Pro
                  </Link>
                </Button>
              </Card>
            ) : mutation.isPending ? (
              <ResultCardsSkeleton />
            ) : result ? (
              <>
                <div className="flex justify-end">
                  <Button
                    variant={favorited ? "default" : "secondary"}
                    size="sm"
                    className={`gap-1.5 ${favorited ? "bg-brand text-primary-foreground" : ""}`}
                    onClick={handleFavorite}
                  >
                    <Star className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
                    {favorited ? "Favoritado" : "Favoritar geração"}
                  </Button>
                </div>
                <ResultCards result={result} />
              </>
            ) : (
              <Card className="grid place-items-center border-dashed border-border/70 bg-card/40 p-12 text-center">
                <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Preencha o tema do vídeo e clique em <strong>Gerar</strong> para ver os resultados
                  aqui.
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
