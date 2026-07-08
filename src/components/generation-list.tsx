import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, Star } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResultCards } from "@/components/result-cards";
import { toggleFavorite } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { PLATFORMS, TONES, type GenerationRecord } from "@/lib/types";

export function GenerationList({
  items,
  favoriteIds,
}: {
  items: GenerationRecord[];
  favoriteIds: Set<string>;
}) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [favs, setFavs] = useState(favoriteIds);

  const platformLabel = (v: string) => PLATFORMS.find((p) => p.value === v)?.label ?? v;
  const toneLabel = (v: string) => TONES.find((t) => t.value === v)?.label ?? v;

  const handleFav = async (id: string) => {
    if (!user) return;
    const on = !favs.has(id);
    const next = new Set(favs);
    on ? next.add(id) : next.delete(id);
    setFavs(next);
    try {
      await toggleFavorite(user.id, id, on);
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(on ? "Adicionado aos favoritos!" : "Removido dos favoritos.");
    } catch {
      setFavs(favs);
      toast.error("Não foi possível atualizar o favorito.");
    }
  };

  return (
    <div className="space-y-3">
      {items.map((g) => {
        const isOpen = open === g.id;
        return (
          <Card key={g.id} className="overflow-hidden border-border/70 bg-card/80">
            <div className="flex items-center gap-3 p-4">
              <button
                className="flex flex-1 items-center gap-3 text-left"
                onClick={() => setOpen(isOpen ? null : g.id)}
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.input_topic}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(g.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </button>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {platformLabel(g.platform)}
              </Badge>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {toneLabel(g.tone)}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleFav(g.id)}
                aria-label="Favoritar"
              >
                <Star
                  className={`h-4 w-4 ${favs.has(g.id) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              </Button>
            </div>
            {isOpen ? (
              <div className="border-t border-border/60 p-4">
                <ResultCards result={g} />
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
