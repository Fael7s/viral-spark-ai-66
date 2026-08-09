import { useState } from "react";
import { PLATFORMS } from "@/lib/types";
import type { ShowcaseExample } from "@/lib/examples";

function platformLabel(value: ShowcaseExample["plataforma"]) {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

/**
 * Par antes/depois de um exemplo escrito a mao. O rotulo de exemplo e
 * obrigatorio: nada aqui e gerado ao vivo para o visitante.
 */
export function ExamplePair({
  example,
  showContext = true,
}: {
  example: ShowcaseExample;
  showContext?: boolean;
}) {
  return (
    <div>
      {showContext ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {example.contexto} · {platformLabel(example.plataforma)}
        </p>
      ) : null}

      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Antes
          </p>
          <p className="mt-3 text-base leading-snug text-muted-foreground">{example.antes}</p>
        </div>

        <div className="bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Depois</p>

          <p className="mt-3 font-display text-lg font-semibold leading-snug text-foreground">
            {example.depois.gancho}
          </p>

          <p className="mt-3 border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground">
            {example.depois.legenda}
          </p>

          <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
            {example.depois.hashtags.map((h) => (
              <li key={h} className="text-xs text-muted-foreground">
                {h}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Alternador entre exemplos, usado no hero. */
export function ExampleSwitcher({ examples }: { examples: ShowcaseExample[] }) {
  const [activeId, setActiveId] = useState(examples[0]?.id);
  const active = examples.find((e) => e.id === activeId) ?? examples[0];

  if (!active) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-border pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Exemplo pronto, não é geração ao vivo
        </p>
      </div>

      <div role="tablist" aria-label="Exemplos de conteúdo" className="mb-5 flex flex-wrap gap-2">
        {examples.map((e) => {
          const selected = e.id === active.id;
          return (
            <button
              key={e.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActiveId(e.id)}
              className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors ${
                selected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {e.contexto}
            </button>
          );
        })}
      </div>

      <ExamplePair example={active} showContext={false} />

      <p className="mt-3 text-xs text-muted-foreground">
        {platformLabel(active.plataforma)} · escrito para este exemplo, não é um resultado de
        cliente
      </p>
    </div>
  );
}

/**
 * Moldura de celular em CSS puro. Recebe o conteudo da tela como children para
 * poder trocar o placeholder por uma screenshot real sem mexer na moldura.
 */
export function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="rounded-[2rem] border border-border bg-secondary p-2.5">
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.5rem] bg-background">
          <span className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-border" />
          {children}
        </div>
      </div>
    </div>
  );
}
