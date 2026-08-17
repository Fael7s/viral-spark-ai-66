# Diagnóstico: "Build malsucedido" nos eventos vindos do GitHub

## O que eu consegui verificar (fatos, agora, neste commit)

- `bun run build` (produção): **exit 0**, "✓ built in 971ms", nitro gerou `dist/server/wrangler.json`, `dist/client/_headers`, `dist/nitro.json`. Zero erros.
- `bun run build:dev` (variante de preview/prerender, onde loaders protegidos costumam quebrar com `Unauthorized`): **exit 0**, "✓ built in 817ms". Só avisos inofensivos: limite de tamanho de chunk e `inlineDynamicImports option is ignored because the codeSplitting option is specified`.
- Log do dev server limpo: Vite 8.0.16 pronto, `(ssr) connected`, nenhuma exceção.
- Ambiente: Node v22.22.0, bun 1.3.3 — a mesma versão de Node em que você diz que funciona fora do Lovable.
- Lockfiles: `bun.lock` e `package-lock.json` coexistem e estão coerentes entre si nos pacotes checados (stripe, vitest, jsdom, nitro, config Lovable).

## Sobre o log de build: não consigo ler

Dizendo explicitamente, como você pediu: **eu não tenho acesso ao log dos builds do pipeline de sincronização com o GitHub.** Meu acesso é a (a) builds que eu mesmo executo neste sandbox, (b) log do dev server do sandbox, (c) logs de runtime do worker publicado. O histórico de builds disparados por push do GitHub não é exposto a nenhuma ferramenta minha, e a UI também não mostra o texto do erro. Portanto não existe "mensagem exata + stack trace" para eu colar — ela não existe em nenhum lugar que eu ou você possamos abrir hoje.

## Leitura do quadro

O sintoma não é um erro de compilação. A compilação passa aqui, passa no seu Node 22 e a versão de 9 Ago aparece como "Publicado" no Histórico. O padrão — 20 eventos "Pushed from GitHub" marcados como falha, zero sucessos, e "A prévia está desatualizada" — aponta para o **estágio de sincronização/ingestão do push**, não para `vite build`:

1. O job que recebe o push falha antes ou depois do build (instalação de dependências em ambiente sem cache, timeout, ou falha ao aplicar o commit no ambiente gerenciado) e marca o evento como malsucedido sem persistir log.
2. Os pushes vêm de fora do Lovable e o ambiente do sandbox continua na versão de 9 Ago — daí "prévia desatualizada" permanente, mesmo com o site publicado funcionando.
3. Menos provável, mas possível: o guard de supply-chain em `bunfig.toml` (`minimumReleaseAge = 86400`) faz a instalação recusar versões publicadas há menos de 24h no runner de CI, algo que o seu build local não sofre porque o `node_modules` já existe.

Nenhuma dessas três é uma hipótese que eu possa confirmar sem o log — e é isso que o plano abaixo resolve primeiro.

## Passos propostos (nenhum altera código de aplicação)

1. **Obter o log de verdade.** Abrir chamado no suporte do Lovable pedindo o log bruto dos eventos "Build malsucedido" do pipeline GitHub deste projeto, com o ID do projeto e a data do último push. É o único caminho para a mensagem exata; nada que eu faça no sandbox a produz.
2. **Isolar sincronização vs. build.** Fazer um push trivial (alterar uma linha de comentário) e observar se o evento também é marcado como falha. Se um commit vazio/trivial falha, o problema é a ingestão do push, não o seu código — e o diagnóstico fica fechado sem tocar em nada.
3. **Testar a hipótese do guard de instalação.** Reproduzir aqui uma instalação limpa (`node_modules` descartado, `bun install --frozen-lockfile`) para ver se a resolução falha em runner frio. Se falhar, o remédio é de configuração de instalação, não de código de aplicação.
4. **Confirmar o estado publicado.** Comparar o bundle publicado com o commit de 9 Ago para determinar quais dos 20 pushes nunca chegaram à produção — assim você sabe exatamente qual trabalho está preso fora do ambiente.

## Fora de escopo

Nenhuma alteração em código de aplicação, Stripe, RLS, limites de geração ou paginação. Se algum passo revelar uma correção necessária, eu volto com ela separadamente para você aprovar.
