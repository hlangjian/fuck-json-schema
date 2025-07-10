export type TemplateContext<T extends { [key: string]: any }>
    = { [key in keyof T]: string[] }
    & { indent: (strings: TemplateStringsArray, ...values: any[]) => string }

export type TemplateBlock<T extends { [key: string]: any }> = {
    [key in keyof T]:
    (template: string | ((context: TemplateContext<T[key]>) => string)) => TemplateBlock<T[key]>
} & { parse: () => string }

export function createTemplate<T extends { [key: string]: any } = { [key: string]: any }>(template: string | ((context: TemplateContext<T>) => string)): TemplateBlock<T> {
    const map = new Map<string | symbol, Set<TemplateBlock<object>>>()

    const templateF = typeof template === 'string' ? () => template : template

    const getContext = () => {
        const ret: object = { indent: indentAwareTemplate }
        for (const [key, pens] of map.entries()) Object.defineProperty(ret, key, {
            enumerable: true,
            value: [...pens].map(o => o.parse())
        })
        return ret as TemplateContext<T>
    }

    const parse = () => templateF(getContext()).trim()

    const proxy = new Proxy({}, {
        get: (_, p) => {
            if (p === 'parse') return parse
            return (template: string | ((context: object) => string)) => {
                const node = createTemplate(template)
                if (!map.has(p)) map.set(p, new Set())
                map.get(p)?.add(node)
                return node
            }
        }
    })

    return proxy as TemplateBlock<T>
}

export function indentAwareTemplate(strings: TemplateStringsArray, ...values: any[]): string {
    const rawStrings = strings.raw;

    // 1. 找出所有 static 片段的最小公共缩进
    function getMinIndent(strs: readonly string[]): number {
        const lines = strs
            .flatMap(s => s.split(/\r?\n/))
            .filter(line => line.trim() !== '');
        const indents = lines.map(line => line.match(/^[ \t]*/)?.[0].length ?? 0);
        return indents.length > 0 ? Math.min(...indents) : 0;
    }

    const commonIndent = getMinIndent(rawStrings);

    // 2. 去除 static 字符串的公共缩进
    const dedentedStrings = rawStrings.map(s =>
        s
            .split(/\r?\n/)
            .map(line =>
                line.startsWith(' '.repeat(commonIndent)) ? line.slice(commonIndent) : line
            )
            .join('\n')
    );

    // 3. 插值时，将 value 中每个 \n 后都加上 preceding 最后一行的缩进
    let result = '';

    for (let i = 0; i < dedentedStrings.length; i++) {
        const preceding = dedentedStrings[i];
        result += preceding;

        // 获取 preceding 中最后一行的缩进
        const lines = preceding.split(/\r?\n/);
        const lastLine = lines[lines.length - 1] || '';
        const indent = lastLine.match(/^[ \t]*/)?.[0] ?? '';

        const value = values[i];

        if (value !== undefined && value !== null) {
            const stringified = String(value);
            const formatted = stringified.replace(/\n/g, '\n' + indent);
            result += formatted;
        }
    }

    return result;
}
