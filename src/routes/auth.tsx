import { useEffect, useState } from "react";
import { z } from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { attributionSignupMetadata } from "@/lib/attribution";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

/**
 * Fonte unica da politica de senha. O schema abaixo e a lista exibida no
 * formulario consomem estas mesmas entradas, entao mudar um requisito e mudar
 * uma linha, e nao duas que podem divergir em silencio.
 *
 * label vai para a lista na tela, message vai para a mensagem de validacao.
 * Os requisitos e as mensagens sao exatamente os que ja vigoravam.
 */
const PASSWORD_RULES = [
  {
    label: "Pelo menos 8 caracteres",
    message: "A senha deve ter pelo menos 8 caracteres.",
    isMet: (value: string) => value.length >= 8,
  },
  {
    label: "Pelo menos 1 letra maiúscula",
    message: "A senha deve conter pelo menos 1 letra maiúscula.",
    isMet: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "Pelo menos 1 número",
    message: "A senha deve conter pelo menos 1 número.",
    isMet: (value: string) => /[0-9]/.test(value),
  },
  {
    label: "Pelo menos 1 caractere especial",
    message: "A senha deve conter pelo menos 1 caractere especial.",
    isMet: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

// superRefine, e nao refine encadeado: encadear produz ZodEffects aninhados,
// onde a regra externa so roda se a interna passar, e voltariamos a ter uma
// pendencia por vez. Aqui todas as regras sao avaliadas na mesma passagem,
// preservando o comportamento que o schema encadeado ja tinha.
const passwordSchema = z.string().superRefine((value, ctx) => {
  for (const rule of PASSWORD_RULES) {
    if (!rule.isMet(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: rule.message });
    }
  }
});

/**
 * The OAuth SDK returns distinct causes behind the same visible outcome
 * ("Popup was blocked", "State is invalid", "No tokens received", the
 * provider's error_description). A blocked popup is something the user can
 * act on, so it gets its own text; everything else stays generic on screen
 * and goes to the log in full.
 */
function oauthMessage(error: Error): string {
  const m = error.message ?? "";
  if (m.includes("Popup was blocked")) {
    return "Seu navegador bloqueou a janela do Google. Libera o pop-up e tenta de novo.";
  }
  if (m.includes("State is invalid")) {
    return "A sessão de login expirou. Tenta entrar com o Google de novo.";
  }
  return "Não foi possível entrar com o Google.";
}

/**
 * Destino do retorno do OAuth para quem veio com intencao de assinar. Fica como
 * constante no codigo de proposito: o path que entra na URL de redirect nunca
 * pode vir de parametro controlado por quem acessa a pagina.
 */
const PRO_OAUTH_RETURN_PATH = "/upgrade";

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isProIntent, setIsProIntent] = useState(false);
  // Mensagens que o schema reportou na ultima tentativa de cadastro. Serve para
  // distinguir 'ainda nao preencheu' de 'tentou enviar e faltou', que mudam a
  // cor da lista. A lista em si e sempre derivada de PASSWORD_RULES.
  const [passwordIssues, setPasswordIssues] = useState<string[]>([]);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    // ?mode= e a unica forma de um CTA declarar em qual aba a tela abre.
    // Qualquer valor fora da lista fechada e ignorado e cai no padrao de baixo,
    // que continua sendo login quando a rota vem sem parametro nenhum.
    const requested = params.get("mode");
    const explicitMode = requested === "login" || requested === "signup" ? requested : null;

    const ref = params.get("ref");
    let hasReferral = false;
    if (ref) {
      const clean = ref.trim().toUpperCase().slice(0, 16);
      if (/^[A-Z0-9]+$/.test(clean)) {
        setReferralCode(clean);
        hasReferral = true;
      }
    }

    const proIntent = params.get("intent") === "pro";
    if (proIntent) {
      setIsProIntent(true);
    }

    // Precedencia: o modo pedido explicitamente vence. Sem ele, tanto um convite
    // por indicacao quanto a intencao de assinar implicam alguem que ainda nao
    // tem conta, e quem ja tem so precisa clicar no alternador.
    if (explicitMode) {
      setMode(explicitMode);
    } else if (hasReferral || proIntent) {
      setMode("signup");
    }
  }, []);

  useEffect(() => {
    if (session) navigate({ to: isProIntent ? "/upgrade" : "/app", replace: true });
  }, [session, navigate, isProIntent]);

  // Erro so aparece depois de uma tentativa que falhou, e some quando nao resta
  // regra pendente, mesmo antes de reenviar o formulario.
  const hasPendingPasswordIssues =
    passwordIssues.length > 0 && PASSWORD_RULES.some((rule) => !rule.isMet(password));

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      const result = passwordSchema.safeParse(password);
      if (!result.success) {
        // Todas as pendencias, nao apenas issues[0]. E em elemento fixo na tela,
        // nao em toast: isto e instrucao para reler enquanto digita, e o toast
        // some sozinho enquanto a pessoa olha o teclado no celular.
        setPasswordIssues(result.error.issues.map((issue) => issue.message));
        return;
      }
      setPasswordIssues([]);
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        // referral_code keeps its previous behaviour exactly: present when a
        // code was captured from ?ref=, absent otherwise. The attribution
        // fields ride alongside it and are omitted when nothing valid was
        // stored, so they arrive absent rather than as empty strings. data
        // stays undefined when there is nothing at all to send, as before.
        const signupMetadata = {
          ...(referralCode ? { referral_code: referralCode } : {}),
          ...attributionSignupMetadata(),
        };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: Object.keys(signupMetadata).length > 0 ? signupMetadata : undefined,
          },
        });
        if (error) throw error;
        // No session means the account is awaiting e-mail confirmation.
        if (!data.session) {
          toast.success("Verifique seu e-mail para ativar sua conta.");
          return;
        }
        toast.success("Conta criada. Pode mandar o primeiro tema.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: isProIntent ? "/upgrade" : "/app", replace: true });
    } catch (err) {
      // Mode and error object only. Never log the e-mail or the password.
      console.error("[auth] password flow failed", { mode, error: err });
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Invalid login") || msg.includes("Email not confirmed")) {
        toast.error("E-mail ou senha incorretos.");
      } else if (msg.includes("already registered")) {
        toast.error("Este e-mail já está cadastrado.");
      } else {
        toast.error("Erro ao autenticar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    // O SDK tem dois caminhos. Dentro de um iframe ele abre popup, nao
    // redireciona, e a navegacao no fim desta funcao leva ao destino certo.
    // Fora de um iframe, que e o caso do site publicado, ele troca a pagina
    // inteira e retorna { redirected: true }: a funcao sai no return abaixo e a
    // navegacao nunca roda, entao o unico registro do destino e o proprio
    // redirect_uri. Com a origem pelada, quem clicou em assinar autenticava e
    // voltava para a raiz do site, logado e sem nenhum rastro da intencao.
    const redirectUri = isProIntent
      ? new URL(PRO_OAUTH_RETURN_PATH, window.location.origin).toString()
      : window.location.origin;
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUri,
    });
    if (result.error) {
      const error = result.error instanceof Error ? result.error : new Error(String(result.error));
      console.error("[auth] signInWithOAuth(google) failed", error);
      reportLovableError(error, { step: "signInWithOAuth", provider: "google" });
      toast.error(oauthMessage(error));
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: isProIntent ? "/upgrade" : "/app", replace: true });
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo className="text-xl" />
        </div>
        <Card className="border-border/70 bg-card/80 p-6">
          <h1 className="text-center text-xl font-bold">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {mode === "login"
              ? "Bom te ver de volta"
              : "Cinco gerações por dia, sem cartão de crédito"}
          </p>

          {isProIntent ? (
            <div className="mt-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-center text-xs text-foreground">
              Você está assinando o Pro — R$29,90/mês — 500 gerações por dia. O pagamento é o
              próximo passo, depois do cadastro.
            </div>
          ) : null}

          {referralCode && mode === "signup" ? (
            <div className="mt-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-center text-xs text-foreground">
              Você foi indicado com o código <strong>{referralCode}</strong>. Seu convidador ganha 5
              gerações extras hoje.
            </div>
          ) : null}

          <Button
            variant="secondary"
            className="mt-6 w-full gap-2"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon /> Continuar com Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-describedby={mode === "signup" ? "password-requisitos" : undefined}
              />
              {/*
                No cadastro os requisitos ficam na tela desde o inicio, todos de
                uma vez e atualizando conforme a pessoa digita. Antes eles so
                apareciam depois de falhar, um por vez, em toast que sumia
                sozinho: eram ate quatro rodadas de fracasso num campo
                obrigatorio. O estado de erro so pinta o que ainda falta, entao
                ele se apaga sozinho a medida que a senha fica valida.
              */}
              {mode === "signup" ? (
                <div
                  id="password-requisitos"
                  className="rounded-md border border-border bg-muted/30 p-3"
                >
                  <p
                    className={`text-xs font-medium ${
                      hasPendingPasswordIssues ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {hasPendingPasswordIssues
                      ? "A senha ainda não atende:"
                      : "A senha precisa ter:"}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.isMet(password);
                      return (
                        <li key={rule.label} className="flex items-center gap-2 text-xs">
                          <Check
                            aria-hidden
                            className={`h-3.5 w-3.5 shrink-0 ${
                              met ? "text-primary" : "text-muted-foreground/40"
                            }`}
                          />
                          <span
                            className={
                              met
                                ? "text-foreground"
                                : hasPendingPasswordIssues
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }
                          >
                            {rule.label}
                          </span>
                          <span className="sr-only">
                            {met ? "requisito atendido" : "requisito pendente"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          {/*
            O alternador era um link de rodape em texto pequeno, facil de nao ver
            em quem caiu na aba errada. Vira um bloco proprio com botao de largura
            total: continua sendo um alternador, nao um conjunto de abas.
          */}
          <div className="mt-6 rounded-md border border-border bg-muted/40 p-3 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "Ainda não tem uma conta?" : "Já tem uma conta?"}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full font-semibold"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Criar conta grátis" : "Entrar na minha conta"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
