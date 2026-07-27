import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const noopRule = {
  meta: {
    type: "suggestion",
    schema: [],
  },
  create() {
    return {};
  },
};

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@next/next": {
        rules: {
          "no-img-element": noopRule,
        },
      },
      "react-hooks": {
        rules: {
          "exhaustive-deps": noopRule,
        },
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
      "no-irregular-whitespace": "off",
      "no-useless-assignment": "off",
      "no-useless-escape": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "lib/generated/**",
    "public/pdf.worker.min.mjs",
  ]),
]);
