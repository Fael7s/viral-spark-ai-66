import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      // Arquivos escritos por um gerador, nao por pessoas. O criterio para
      // entrar nesta lista e a origem do arquivo (quem o escreve), nao a
      // presenca de um cabecalho de aviso: o cabecalho e uma peculiaridade dos
      // emissores do Lovable, nao uma marca universal de codigo gerado.
      // Qualquer correcao aqui voltaria a falhar na proxima regeneracao.
      "src/integrations/supabase/auth-attacher.ts",
      "src/integrations/supabase/auth-middleware.ts",
      "src/integrations/supabase/client.ts",
      "src/integrations/supabase/client.server.ts",
      "src/integrations/supabase/previewAuthStorage.ts",
      "src/integrations/lovable/index.ts",
      // Saida de `supabase gen types typescript`: contem o bloco
      // __InternalSupabase, os helpers Tables/TablesInsert/TablesUpdate/Enums
      // e o epilogo `export const Constants`, e muda junto com
      // supabase/migrations no mesmo commit (ver b27d335, que criou a tabela
      // demo_generation_limits).
      "src/integrations/supabase/types.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintPluginPrettier,
);
