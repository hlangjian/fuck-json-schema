import { defineConfig } from "oxlint"

export default defineConfig({
  options: { typeAware: true },
  plugins: ["eslint", "typescript", "unicorn", "oxc", "import"],
  jsPlugins: ["@stylistic/eslint-plugin"],
  rules: {
    "typescript/no-deprecated": "warn",

    // Bug
    "import/namespace": "off",

    "@stylistic/padding-line-between-statements": [
      "error",

      // 默认：所有语句之间要求空一行
      {
        blankLine: "always",
        prev: "*",
        next: "*",
      },

      // import -> import：随意
      {
        blankLine: "any",
        prev: "import",
        next: "import",
      },

      // import -> 任意：随意
      {
        blankLine: "any",
        prev: "import",
        next: "*",
      },

      // 任意 -> import：随意
      {
        blankLine: "any",
        prev: "*",
        next: "import",
      },
    ],
  },
})
