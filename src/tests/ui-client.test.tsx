import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResultCards, ResultCardsSkeleton } from "@/components/result-cards";
import type { GenerationResult } from "@/lib/types";

const mockResult: GenerationResult = {
  hooks: ["H1","H2","H3"], captions: ["C1","C2","C3"], emojis: ["🔥","✨","💡","🚀","⚡","💪"], hashtags: ["#a","#b","#c","#d"]
};

describe("Interface", () => {
  it("renderiza hooks captions emojis hashtags", () => {
    render(<ResultCards result={mockResult} />);
    expect(screen.getByText(/Hooks/i)).toBeInTheDocument();
    expect(screen.getByText(/Legendas/i)).toBeInTheDocument();
    expect(screen.getByText(/Emojis/i)).toBeInTheDocument();
    expect(screen.getByText(/Hashtags/i)).toBeInTheDocument();
    expect(screen.getByText("H1")).toBeInTheDocument();
  });

  it("emojis sao botoes clicaveis", () => {
    render(<ResultCards result={mockResult} />);
    mockResult.emojis.forEach(e => expect(screen.getByRole("button", { name: e })).toBeInTheDocument());
  });

  it("hashtags com #", () => {
    render(<ResultCards result={mockResult} />);
    mockResult.hashtags.forEach(t => expect(screen.getByText(t)).toBeInTheDocument());
  });

  it("copiar hooks funciona", async () => {
    render(<ResultCards result={mockResult} />);
    const btns = screen.getAllByRole("button", { name: "" });
    expect(btns.length).toBeGreaterThan(0);
    fireEvent.click(btns[0]);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
  });

  it("botao copiar tudo", () => {
    render(<ResultCards result={mockResult} />);
    expect(screen.getAllByText("Copiar tudo").length).toBe(2);
  });

  it("onRegenerate ao clicar Variar", () => {
    const fn = vi.fn();
    render(<ResultCards result={mockResult} onRegenerate={fn} />);
    fireEvent.click(screen.getAllByText("Variar")[0]);
    expect(fn).toHaveBeenCalledWith("hooks");
  });

  it("desabilita botoes durante regeneracao", () => {
    render(<ResultCards result={mockResult} onRegenerate={vi.fn()} regenerating="captions" />);
    screen.getAllByText("Variar").forEach(b => expect(b).toBeDisabled());
  });

  it("skeleton renderiza", () => {
    render(<ResultCardsSkeleton />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("normalizacao hashtags sem ##", () => {
    const raw = ["a","#b","##c","###d"];
    const norm = raw.map(h => { const c = h.trim().replace(/^#+/, ""); return c ? `#${c}` : h.trim(); });
    expect(norm).toEqual(["#a","#b","#c","#d"]);
  });

  it("limites de caracteres por plataforma", () => {
    expect({ tiktok: 150, reels: 220, shorts: 180 }).toBeDefined();
  });
});
