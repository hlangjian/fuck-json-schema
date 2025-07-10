# @huanglangjian/template

A TypeScript template engine for generating code with automatic indentation
handling.

## Features

- Type-safe template creation
- Automatic indentation management
- Fluent API for building complex templates

## Installation

```bash
npm install @huanglangjian/template
```

## Basic Usage

```typescript
import { createTemplate } from "@huanglangjian/template";

// Create a simple template
const template = createTemplate`Hello ${"world"}!`;
console.log(template.parse()); // "Hello world!"

// With indentation handling
const indented = createTemplate((o) =>
    o.indent`
    function test() {
        ${'console.log("indented");'}
    }
`
);
console.log(indented.parse());
```

## Language-Specific Templates

### JavaScript Example

```typescript
import { createTemplate } from "@huanglangjian/template";
import type { JavaScriptFile } from "@huanglangjian/template/javascript";

const jsFile = createTemplate<JavaScriptFile>((o) =>
    o.indent`
    ${o.class}
    ${o.function}
`
);

const MyClass = jsFile.class((o) =>
    o.indent`
    class MyClass {
        ${o.method}
    }
`
);

MyClass.method((o) =>
    o.indent`
    logMessage() {
        console.log('Hello from method');
    }
`
);

console.log(jsFile.parse());
```

## API Reference

### `createTemplate<T>(template: string | ((context: TemplateContext<T>) => string)): TemplateBlock<T>`

Creates a new template block. The template can be either:

- A string literal
- A function that receives a context object

### `indentAwareTemplate(strings: TemplateStringsArray, ...values: any[]): string`

Handles indentation automatically for template literals. Features:

- Removes common indentation from static parts
- Preserves relative indentation for dynamic parts
- Handles multi-line values properly

## Advanced Usage

### Nested Templates

```typescript
const template = createTemplate((o) =>
    o.indent`
    ${o.section1}
    ${o.section2}
`
);

template.section1((o) =>
    o.indent`
    First section:
    ${o.subsection}
`
).subsection("Content");

template.section2("Second section");

console.log(template.parse());
```

### Custom Context Types

```typescript
interface MyContext {
    header: string[];
    body: string[];
}

const template = createTemplate<MyContext>((o) =>
    o.indent`
    ${o.header.join("\n")}
    ${o.body.join("\n")}
`
);

template.header("Custom Header");
template.body("First line");
template.body("Second line");

console.log(template.parse());
```
