import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker イメージを軽量化するため、実行に必要なファイルだけを
  // .next/standalone に出力する（K8s デプロイを想定）
  output: "standalone",
  // モノレポのため、ファイルトレースのルートをリポジトリルートに合わせる
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
