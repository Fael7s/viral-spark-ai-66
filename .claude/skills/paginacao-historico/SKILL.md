---

name: paginacao-historico

description: Implementa paginacao no historico de geracoes via Supabase .range() (Issue #8)

disable-model-invocation: true

---

Branch: feat/history-pagination. As regras do CLAUDE.md valem integralmente.

1. Localize fetchHistory e fetchFavorites. Reporte os caminhos ANTES de editar.

2. Leia como o retorno de fetchHistory e consumido na UI antes de mudar a assinatura.

3. Implemente .range(from, to): pagina de 20, { count: 'exact' },

   retorno { data, count, hasMore } em vez do array puro.

   4. Ajuste a UI para carregamento incremental respeitando o design system.

   5. fetchFavorites hoje nao tem cap e a landing promete "favoritos sem limite".

      Se paginar altera essa promessa, PARE e reporte. Ver secao CDC no CLAUDE.md.

      6. Rode a suite completa. Se quebrar, corrija o codigo, nao o teste.

      7. Abra PR contra main referenciando a Issue #8.

      Se algo for ambiguo, pare e reporte. Nao invente comportamento de produto.
