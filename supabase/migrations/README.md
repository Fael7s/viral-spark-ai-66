# Migrations

Este diretório é a fonte de verdade do schema: tabelas, RLS, policies, grants
e funções `SECURITY DEFINER`. Os arquivos seguem a convenção
`<timestamp>_<uuid>.sql` e são aplicados em ordem de timestamp.

Estar versionado aqui **não** significa estar aplicado no banco. As duas coisas
são independentes, e é isso que esta página existe para rastrear.

## Estado de aplicação

| Migration | O que faz | Aplicada em produção |
| --- | --- | --- |
| `20260708215650_225d6180-...` | Enum `plan_type`; tabelas `profiles`, `subscriptions`, `generations`, `favorites`, `usage_limits`; RLS e policies iniciais; `handle_new_user`; `consume_generation` | Sim (indireto) |
| `20260708215745_54f218bf-...` | Revoga `EXECUTE` de `handle_new_user`, `update_updated_at_column` e `consume_generation` | Sim (indireto) |
| `20260711150916_35f5cb7f-...` | `generations` passa a SELECT-only; revoga escrita de `authenticated`; policies de `favorites`; coluna `last_stripe_event_created` | Sim (indireto) |
| `20260715015210_69b0d315-...` | Tabela `processed_webhooks`; função `check_rate_limit` | Sim (indireto) |
| `20260715015229_2f284f12-...` | Policy `deny all` em `processed_webhooks`; grants de `check_rate_limit` | Sim (indireto) |
| `20260716233309_d87d870e-...` | Colunas de indicação em `profiles`; `generate_referral_code`; tabela `referral_bonuses`; `handle_new_user` e `consume_generation` reescritas com o bônus | Sim (indireto) |
| `20260716233327_a7fd1d9b-...` | Grants de `generate_referral_code` | Sim (indireto) |
| `20260819173500_a5e0e31f-...` | **`refund_generation`**: devolve uma geração diária quando a requisição não entrega nada | **Sim** — verificada em 2026-08-20 por consulta a `pg_proc` no schema `public` (`refund_generation` presente, `prosecdef = true`). Confirmado por consulta direta ao catálogo, não por registro de pipeline |
| `20260820120000_0218220a-...` | Colunas `is_internal`, `utm_source`, `utm_medium`, `utm_campaign`, `landing_path`, `first_seen_at` em `profiles`; `handle_new_user` reescrita para gravá-las | **Sim** — verificada em 2026-08-20: `information_schema.columns` retorna as 6 colunas novas em `public.profiles`, e `pg_get_functiondef` confirma que `handle_new_user` no banco menciona `first_seen_at` e `utm_source` |

"Sim (indireto)" quer dizer que não foi verificado contra o banco a partir daqui,
e sim inferido do fato de que a aplicação em produção depende dessas estruturas
para funcionar: sem as tabelas, sem a RLS e sem `consume_generation` o fluxo de
geração não completaria. Para confirmar de verdade, rode as queries da seção
"Como conferir" abaixo.

## A migration pendente

`20260819173500_a5e0e31f-5802-4247-bde0-2d3c0f2119b8.sql` cria a RPC
`refund_generation`, chamada por `src/lib/generate.functions.ts` sempre que uma
geração já debitada falha antes de entregar resultado (timeout do gateway de
IA, 5xx, saída inválida, rate limit por minuto).

Enquanto ela não for aplicada:

- O código continua funcionando. A chamada de estorno é best-effort: o erro dela
  é engolido e a exceção original é re-lançada intacta, então o usuário vê a
  mesma mensagem de sempre e a causa raiz continua chegando ao log.
- O estorno simplesmente não acontece. O usuário continua perdendo a geração
  quando a falha é nossa — que é exatamente o bug que a migration corrige.
- O log registra um `console.warn` por falha, identificando a migration pendente.
  Não é `console.error` de propósito: é lacuna de deploy, não falha de runtime.

## Como aplicar

**Não sei qual é o procedimento oficial do Lovable Cloud para aplicar
migrations.** Verificar no painel. O que é possível afirmar a partir do
repositório:

- Não existe script de migration no `package.json`.
- O Supabase CLI não está nas dependências do projeto.
- `supabase/config.toml` contém apenas `project_id`, sem seção de migrations.

Ou seja, a aplicação não é disparada por nada versionado aqui. As duas rotas
plausíveis, ambas a confirmar antes de usar:

1. **Pelo painel do Lovable / Supabase.** Abrir o SQL Editor do projeto Supabase
   e executar o conteúdo do arquivo pendente. É a rota que não depende de
   ferramenta local. Confirmar no painel se o Lovable oferece um passo próprio de
   "aplicar migrations" antes de rodar SQL na mão, para que o histórico de
   migrations do projeto não fique fora de sincronia.
2. **Pelo Supabase CLI.** O caminho padrão da ferramenta seria vincular o projeto
   e empurrar as migrations pendentes. Não confirmei que este projeto está
   configurado para isso, e o CLI não está instalado aqui, então trate como
   hipótese a validar, não como instrução.

Lembrete de plataforma, para não confundir os dois assuntos: o Lovable Cloud não
faz deploy em push nem em merge no GitHub, e exige clique manual em "Publicar
alterações". Publicar o código **não** aplica migration nenhuma. São dois passos
separados.

## Como conferir o que está aplicado

Somente leitura. Rodar no SQL Editor do Supabase.

Funções existentes, com o modo de segurança e o `search_path`:

```sql
select p.proname                                 as funcao,
       pg_get_function_identity_arguments(p.oid) as assinatura,
       p.prosecdef                               as security_definer,
       p.proconfig                               as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
```

`refund_generation` aparecendo nessa lista significa que a migration pendente
foi aplicada.

Tabelas e estado da RLS:

```sql
select c.relname        as tabela,
       c.relrowsecurity as rls_habilitada
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
```

Se o projeto mantiver a tabela de histórico do Supabase CLI, ela lista o que já
foi registrado como aplicado:

```sql
select version, name, statements is not null as tem_sql
from supabase_migrations.schema_migrations
order by version;
```

Essa última query falha se o schema `supabase_migrations` não existir, o que por
si só já é a resposta: o histórico do CLI não está em uso neste projeto.

## Ao adicionar uma migration nova

- Manter a convenção `<timestamp>_<uuid>.sql`, com timestamp maior que o da
  última existente.
- Seguir o padrão das funções já presentes: `SECURITY DEFINER` com
  `SET search_path = public`, identidade derivada de `auth.uid()` internamente
  em vez de aceitar `user_id` como argumento, e `REVOKE`/`GRANT` explícitos.
- Atualizar a tabela de estado de aplicação no topo deste arquivo, marcando a
  migration nova como pendente até ela ser aplicada de fato.
