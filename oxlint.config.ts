import { defineConfig } from "oxlint"

export default defineConfig({
  options: { typeAware: true },
  plugins: ["eslint", "typescript", "unicorn", "oxc", "import"],
  rules: {
    "typescript/no-deprecated": "warn",

    // Bug
    "import/namespace": "off",
  },
})
