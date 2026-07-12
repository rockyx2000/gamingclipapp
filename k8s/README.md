# Kubernetes マニフェスト（予定地）

本番運用フェーズで、自宅 Kubernetes クラスタ向けのマニフェストをここに置く。

## 想定する構成

- `web-deployment.yaml` - apps/web の Deployment
  - `livenessProbe` / `readinessProbe` に `GET /api/healthz` を使う
  - `securityContext: runAsUser: 1001`（Dockerfile の非 root ユーザーと揃える）
- `web-service.yaml` - ClusterIP Service
- `ingress.yaml` - Ingress（またはお使いの Gateway）
- 将来: `api-deployment.yaml`、PostgreSQL（StatefulSet か外部 DB）、MinIO

## イメージのビルド

リポジトリルートで:

```bash
docker build -f apps/web/Dockerfile -t gamingclipapp-web:dev .
docker run --rm -p 3000:3000 gamingclipapp-web:dev
```
