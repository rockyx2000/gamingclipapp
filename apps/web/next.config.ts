import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker イメージを軽量化するため、実行に必要なファイルだけを
  // .next/standalone に出力する（K8s デプロイを想定）
  output: "standalone",
  // モノレポのため、ファイルトレースのルートをリポジトリルートに合わせる
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // packages/shared は TypeScript のソースのまま配布しているので、Next にトランスパイルさせる
  transpilePackages: ["@gamingclipapp/shared"],
};

export default nextConfig;
