import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { History as HistoryIcon, Loader2, Wand2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { GenerationList } from "@/components/generation-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchHistory, fetchFavoriteIds, type HistoryCursor } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Histórico de gerações — ViralCaption" },
      {
        name: "description",
        content:
          "Veja todas as suas gerações de hooks, legendas, emojis e hashtags salvas no ViralCaption.",
      },
      { property: "og:title", content: "Histórico de gerações — ViralCaption" },
      {
        property: "og:description",
        content: "Todo o seu histórico de conteúdos virais gerados, sempre à mão.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["history"],
    queryFn: ({ pageParam }) => fetchHistory(pageParam as HistoryCursor | null),
    initialPageParam: null as HistoryCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const { data: favIds } = useQuery({ queryKey: ["favoriteIds"], queryFn: fetchFavoriteIds });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          <HistoryIcon className="h-6 w-6 text-primary" /> Histórico
        </h1>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            <GenerationList items={items} favoriteIds={favIds ?? new Set()} />
            {hasNextPage ? (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <Card className="grid place-items-center border-dashed border-border/70 bg-card/40 p-12 text-center">
            <Wand2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nada aqui ainda. O que você escrever fica guardado nesta página.
            </p>
            <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/app">Escrever a primeira</Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
