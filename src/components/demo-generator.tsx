import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultCards, ResultCardsSkeleton } from "@/components/result-cards";
import {
  generateDemoContent,
  DEMO_TOPIC_MAX_LENGTH,
  DEMO_ERROR_MESSAGES,
} from "@/lib/generate-demo.functions";
import { TOPIC_MIN_LENGTH } from "@/lib/generate.functions";
import type { GenerationResult } from "@/lib/types";
import { toast } from "sonner";

export function DemoGenerator() {
  const generate = useServerFn(generateDemoContent);
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [usedDemo, setUsedDemo] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const mutation = useMutation({
    mutationFn: () => generate({ data: { topic } }),
    onSuccess: (data) => {
      setResult(data);
      setUsedDemo(true);
    },
    onError: (err: Error) => {
      console.error("[demo-generator] request failed", err);
      if (err.message.includes("DEMO_LIMIT_REACHED")) {
        setLimitReached(true);
        setUsedDemo(true);
        return;
      }
      const key = Object.keys(DEMO_ERROR_MESSAGES).find((k) => err.message.includes(k));
      toast.error(key ? DEMO_ERROR_MESSAGES[key] : "Não deu para gerar agora. Tenta de novo.");
    },
  });

  // O aviso de limite ocupa exatamente o lugar do formulario. Antes ele so
  // existia no rodape do card, abaixo dos blocos de emojis e hashtags: na altura
  // de rolagem onde a pessoa acabava de clicar, o formulario sumia e nada
  // ocupava o espaco, entao a quarta tentativa parecia um clique que nao fez
  // nada. Medicao do verificador: cerca de 930 pixels entre o centro do botao e
  // a borda do painel, em viewport de 1512 por 795.
  const limitNotice = (
    <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-center text-sm text-foreground">
      Limite de demonstração atingido. Crie sua conta grátis para continuar.
      <Button
        asChild
        className="mt-3 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Link to="/auth" search={{ mode: "signup" }}>
          Criar minha conta grátis
        </Link>
      </Button>
    </div>
  );

  const signupCta = (
    <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-center text-sm text-foreground">
      Gostou? Crie sua conta grátis e gere 5 por dia.
      <Button
        asChild
        className="mt-3 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Link to="/auth" search={{ mode: "signup" }}>
          Criar minha conta grátis
        </Link>
      </Button>
    </div>
  );

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
        <h2 className="text-3xl font-bold">Teste com o seu vídeo</h2>
        <p className="mt-4 text-muted-foreground">
          Descreva o vídeo que você quer gravar e gere um exemplo de verdade, sem criar conta.
        </p>

        <Card className="mt-8 space-y-4 border-border/70 bg-card/80 p-6">
          {/*
            O servidor concede DEMO_DAILY_LIMIT_PER_IP geracoes por IP por dia.
            O formulario so sai da tela quando o servidor recusa com
            DEMO_LIMIT_REACHED; uma geracao bem-sucedida nao encerra a sessao de
            teste. Nao ha contador de tentativas restantes aqui de proposito: o
            cliente nao sabe quantas o IP ja consumiu hoje, entao qualquer numero
            exibido seria adivinhacao.
          */}
          {!limitReached ? (
            <>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="demo-topic">Descreva o seu vídeo</Label>
                  <span
                    aria-hidden
                    className={`text-xs tabular-nums ${
                      topic.length > DEMO_TOPIC_MAX_LENGTH * 0.9
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {topic.length}/{DEMO_TOPIC_MAX_LENGTH}
                  </span>
                </div>
                <Input
                  id="demo-topic"
                  value={topic}
                  maxLength={DEMO_TOPIC_MAX_LENGTH}
                  aria-describedby="demo-topic-hint"
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Loja avisando que chegou coleção nova"
                />
                {/*
                  Mesmo padrao ja usado dentro do app. Na landing o botao ficava
                  esmaecido sem dizer por que, justamente para o visitante que
                  ainda nao confia no produto. O numero sai de TOPIC_MIN_LENGTH,
                  a mesma constante que controla o disabled do botao abaixo,
                  entao os dois nunca podem divergir.
                */}
                {topic.trim().length < TOPIC_MIN_LENGTH ? (
                  <p id="demo-topic-hint" className="text-xs text-muted-foreground">
                    Escreve pelo menos {TOPIC_MIN_LENGTH} caracteres para liberar o botão.
                  </p>
                ) : null}
              </div>
              <Button
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={mutation.isPending || topic.trim().length < TOPIC_MIN_LENGTH}
                onClick={() => mutation.mutate()}
              >
                <Wand2 className="h-4 w-4" />
                {mutation.isPending
                  ? "Gerando..."
                  : usedDemo
                    ? "Gerar outro exemplo"
                    : "Gerar meu exemplo"}
              </Button>
            </>
          ) : (
            limitNotice
          )}

          {mutation.isPending ? <ResultCardsSkeleton /> : null}

          {!mutation.isPending && result ? (
            <div className="space-y-4">
              <ResultCards result={result} />
              {/*
                Com o limite atingido, o limitNotice que ocupa o lugar do
                formulario ja traz o proprio CTA, entao o signupCta sai daqui:
                sao a mesma chamada, e empilhar dois botoes iguais na mesma tela
                nao ajuda ninguem. Sobra exatamente um CTA, e ele fica na altura
                de rolagem onde a pessoa clicou.
              */}
              {!limitReached ? signupCta : null}
            </div>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
