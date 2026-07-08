import { useState } from "react";
import { Copy, Check, Star, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { GenerationResult } from "@/lib/types";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success("Copiado!");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Não foi possível copiar.");
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label ?? "Copiar"}
    </Button>
  );
}

function CardShell({
  title,
  emoji,
  children,
  copyAll,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
  copyAll?: string;
}) {
  return (
    <Card className="flex flex-col gap-3 border-border/70 bg-card/80 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <span className="text-base">{emoji}</span> {title}
        </h3>
        {copyAll ? <CopyButton text={copyAll} label="Copiar tudo" /> : null}
      </div>
      {children}
    </Card>
  );
}

export function ResultCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="space-y-3 border-border/70 bg-card/80 p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
        </Card>
      ))}
    </div>
  );
}

export function ResultCards({
  result,
  onRegenerate,
  regenerating,
}: {
  result: GenerationResult;
  onRegenerate?: (field: keyof GenerationResult) => void;
  regenerating?: keyof GenerationResult | null;
}) {
  const regenBtn = (field: keyof GenerationResult) =>
    onRegenerate ? (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        disabled={!!regenerating}
        onClick={() => onRegenerate(field)}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${regenerating === field ? "animate-spin" : ""}`} />
        Variar
      </Button>
    ) : null;

  return (
    <div className="grid animate-in fade-in slide-in-from-bottom-2 gap-4 duration-500 md:grid-cols-2">
      <Card className="flex flex-col gap-3 border-border/70 bg-card/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <span className="text-base">🎣</span> Hooks
          </h3>
          {regenBtn("hooks")}
        </div>
        <ul className="flex flex-col gap-2">
          {result.hooks.map((h, i) => (
            <li
              key={i}
              className="group flex items-start justify-between gap-2 rounded-lg bg-secondary/50 p-2.5 text-sm"
            >
              <span className="font-medium leading-snug">{h}</span>
              <CopyButton text={h} label="" />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3 border-border/70 bg-card/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <span className="text-base">📝</span> Legendas
          </h3>
          {regenBtn("captions")}
        </div>
        <ul className="flex flex-col gap-2">
          {result.captions.map((c, i) => (
            <li
              key={i}
              className="group flex items-start justify-between gap-2 rounded-lg bg-secondary/50 p-2.5 text-sm"
            >
              <span className="leading-snug">{c}</span>
              <CopyButton text={c} label="" />
            </li>
          ))}
        </ul>
      </Card>

      <CardShell title="Emojis" emoji="✨" copyAll={result.emojis.join(" ")}>
        <div className="flex flex-wrap gap-2 text-2xl">
          {result.emojis.map((e, i) => (
            <button
              key={i}
              className="rounded-lg bg-secondary/50 px-2 py-1 transition-transform hover:scale-110"
              onClick={() => {
                navigator.clipboard.writeText(e);
                toast.success("Emoji copiado!");
              }}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-end">{regenBtn("emojis")}</div>
      </CardShell>

      <CardShell title="Hashtags" emoji="#️⃣" copyAll={result.hashtags.join(" ")}>
        <div className="flex flex-wrap gap-2">
          {result.hashtags.map((h, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer text-sm hover:bg-primary/20"
              onClick={() => {
                navigator.clipboard.writeText(h);
                toast.success("Hashtag copiada!");
              }}
            >
              {h}
            </Badge>
          ))}
        </div>
        <div className="mt-1 flex justify-end">{regenBtn("hashtags")}</div>
      </CardShell>
    </div>
  );
}
