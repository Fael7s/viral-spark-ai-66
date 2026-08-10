# ViralCaption — regras de projeto

## Stack

TanStack Start + Vite + React (SSR ativo), Supabase (Postgres + Auth + RLS),

Stripe em LIVE MODE, Tailwind + shadcn/ui.

## Deploy

Host: Lovable Cloud. Merge no GitHub NAO publica em producao.

A publicacao e um clique manual em "Publicar alteracoes" no painel Lovable.

Nunca afirme que uma mudanca esta em producao apos um merge.

## Invariantes que ja causaram outage

1. Nunca remover .lovable/project.json do tracking do git. Ja derrubou producao.

2. Nunca editar .gitignore.

3. Os pares duplicados de variaveis Supabase no .env (com e sem prefixo VITE_)

   sao arquiteturais, nao vazamento. Nao "corrigir".

   ## Git

   Nunca commitar na main. Nunca force-push. Nunca reescrever historico.

   Push imediato apos cada commit, depois git log origin/<branch> -1

   para confirmar hash remoto. O container e efemero.

   ## Fora de escopo sem autorizacao explicita

   Stripe, webhooks, billing, policies RLS, migrations do Supabase.

   ## Seguranca

   Nunca imprimir, transcrever ou logar valor de variavel de ambiente,

   nem parcial, nem mascarado, nem prefixo.

   ## Design system

   Space Grotesk em headings. Plus Jakarta Sans no body. Accent #c6ff3d.

   Nao introduzir componente novo se houver equivalente shadcn/ui no projeto.

   ## Estilo

   Proibido emoji em arquivo, comentario, mensagem de commit, log ou texto de UI.

   ## Contexto legal

   Promessa na landing page vincula o fornecedor (art. 30 do CDC).

   Divergencia entre copy e comportamento do codigo e exposicao juridica,

   nao detalhe cosmetico. Ao encontrar, PARE e reporte.
