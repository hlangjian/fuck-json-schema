import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { SpecsVite } from '@huanglangjian/schema-file-base-watcher'

export default defineConfig({
    plugins: [tsconfigPaths(), SpecsVite()]
})