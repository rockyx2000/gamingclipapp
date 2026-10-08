import { defineConfig } from "tsup";

// 依存を全部バンドルに含め、実行イメージに node_modules を持ち込まない。
// （packages/shared は TypeScript のソースのまま配布しているので、いずれにせよ含める必要がある）
export default defineConfig({
  entry: ["src/index.ts", "src/db/migrate.ts", "src/db/seed.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  noExternal: [/.*/],
  // バンドルされた CJS 依存が require を使っても動くようにする
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
});
