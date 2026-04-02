import { defineConfig } from "oxfmt"

export default defineConfig({
  ignorePatterns: ["dist/**", "*.min.js"],
  printWidth: 120,
  semi: false,
  sortImports: true,
  sortTailwindcss: true,
})
