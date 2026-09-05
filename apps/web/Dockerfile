# apps/web 用のマルチステージ Dockerfile
# ビルドはリポジトリルートをコンテキストに実行する:
#   docker build -f apps/web/Dockerfile -t gamingclipapp-web .

# ---- 依存関係のインストール ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
RUN npm ci

# ---- ビルド ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w apps/web

# ---- 実行 ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 非 root ユーザーで実行する（K8s の securityContext と揃える）
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# アップロードした動画と投稿メタデータの保存先。
# K8s では PersistentVolume を /data にマウントする（fsGroup: 1001 を推奨）
ENV DATA_DIR=/data
RUN mkdir -p /data && chown nextjs:nodejs /data
VOLUME ["/data"]

# standalone 出力（モノレポ構成のためリポジトリルート相当の構造になる）
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
