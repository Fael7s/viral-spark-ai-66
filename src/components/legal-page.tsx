import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { VENDOR } from "@/lib/vendor";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function SupportMailto({ className }: { className?: string }) {
  return (
    <a
      href={`mailto:${VENDOR.emailSuporte}`}
      className={`font-medium text-primary underline underline-offset-4 hover:opacity-80 ${className ?? ""}`}
    >
      {VENDOR.emailSuporte}
    </a>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: {VENDOR.dataPublicacao}
        </p>
        {children}
        <div className="mt-14 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          <Link to="/" className="text-primary underline underline-offset-4 hover:opacity-80">
            Voltar para a página inicial
          </Link>
        </div>
      </main>
    </div>
  );
}
