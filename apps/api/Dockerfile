# apps/api 用のマルチステージ Dockerfile
# ビルドはリポジトリルートをコンテキストに実行する:
#   docker build -f apps/api/Dockerfile -t gamingclipapp-api .

# ---- 依存関係のインストール ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci -w apps/api

# ---- ビルド（依存を全部 1 つのバンドルにまとめる） ----
# deps ステージをそのまま使う（workspace ごとの node_modules も引き継ぐため）
FROM deps AS builder
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN npm run build -w apps/api

# ---- 実行 ----
FROM node:22-alpine AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production

# 非 root ユーザーで実行する（K8s の securityContext と揃える）
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 api

# アップロードした動画・サムネイルの保存先。K8s では PersistentVolume を /data にマウントする
ENV DATA_DIR=/data
RUN mkdir -p /data && chown api:nodejs /data
VOLUME ["/data"]

# バンドル済みなので node_modules は要らない。マイグレーションの SQL だけ持ち込む
COPY --from=builder --chown=api:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=api:nodejs /app/apps/api/drizzle ./drizzle
# シードのクリップの動画（開発用）
COPY --from=builder --chown=api:nodejs /app/apps/api/seed-media ./seed-media

USER api
EXPOSE 4000
ENV PORT=4000

CMD ["node", "dist/index.js"]
