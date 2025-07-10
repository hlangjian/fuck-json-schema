import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        'index': 'src/main.ts',
        'java': 'src/java.ts',
        'javascript': 'src/javascript.ts',
        'chsarp': 'src/chsarp.ts',
        'go': 'src/go.ts',
        'python': 'src/python.ts',
        'rust': 'src/rust.ts'
    },
    format: ['esm'],
    dts: {
        entry: {
            'index': 'src/main.ts',
            'java': 'src/java.ts',
            'javascript': 'src/javascript.ts',
            'chsarp': 'src/chsarp.ts',
            'go': 'src/go.ts',
            'python': 'src/python.ts',
            'rust': 'src/rust.ts'
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