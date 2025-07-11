import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        'index': 'src/main.ts',
        'java': 'src/types/java.ts',
        'javascript': 'src/types/javascript.ts',
        'chsarp': 'src/types/chsarp.ts',
        'go': 'src/types/go.ts',
        'python': 'src/types/python.ts',
        'rust': 'src/types/rust.ts'
    },
    format: ['esm'],
    dts: {
        entry: {
            'index': 'src/main.ts',
            'java': 'src/types/java.ts',
            'javascript': 'src/types/javascript.ts',
            'chsarp': 'src/types/chsarp.ts',
            'go': 'src/types/go.ts',
            'python': 'src/types/python.ts',
            'rust': 'src/types/rust.ts'
        }
    },
    clean: true,
    sourcemap: true,
    minify: false,
    target: 'es2022',
    outDir: 'dist',
    splitting: false,
    skipNodeModulesBundle: true,
    esbuildOptions(options) {
        options.drop = ['console', 'debugger']
    },
})