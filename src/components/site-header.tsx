import { Link, useRouter } from "@tanstack/react-router";
import { Sparkles, LogOut, History, Star, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-extrabold text-lg ${className ?? ""}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand shadow-glow">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </span>
      <span>
        Viral<span className="text-gradient">Caption</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const path = router.state.location.pathname;

  const navItem = (to: string, label: string, Icon: typeof Wand2) => (
    <Link
      to={to}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        path === to ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        {session ? (
          <nav className="flex items-center gap-1">
            {navItem("/app", "Gerar", Wand2)}
            {navItem("/history", "Histórico", History)}
            {navItem("/favorites", "Favoritos", Star)}
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair" className="ml-1">
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild className="bg-brand text-primary-foreground hover:opacity-90">
              <Link to="/auth">Começar grátis</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
