// Minimal ambient types for Bun's test runner (`bun:test`) so `tsc` / `next build`
// can resolve the imports in *.test.ts files. Tests are executed with `bun test`.
// If `@types/bun` is ever added as a devDependency, delete this file.
declare module "bun:test" {
  type TestFn = () => void | Promise<void>;

  export function test(name: string, fn: TestFn): void;
  export function beforeAll(fn: TestFn): void;
  export function afterAll(fn: TestFn): void;
}
