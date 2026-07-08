import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History as HistoryIcon, Wand2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { GenerationList } from "@/components/generation-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchHistory, fetchFavoriteIds } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["history"], queryFn: fetchHistory });
  const { data: favIds } = useQuery({ queryKey: ["favoriteIds"], queryFn: fetchFavoriteIds });

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
        ) : data && data.length > 0 ? (
          <GenerationList items={data} favoriteIds={favIds ?? new Set()} />
        ) : (
          <Card className="grid place-items-center border-dashed border-border/70 bg-card/40 p-12 text-center">
            <Wand2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Você ainda não gerou nenhum conteúdo.
            </p>
            <Button asChild className="mt-4 bg-brand text-primary-foreground hover:opacity-90">
              <Link to="/app">Gerar agora</Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
