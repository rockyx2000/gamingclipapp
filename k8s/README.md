# Kubernetes マニフェスト（予定地）

本番運用フェーズで、自宅 Kubernetes クラスタ向けのマニフェストをここに置く。

## 想定する構成

- `web-deployment.yaml` - apps/web の Deployment
  - `livenessProbe` / `readinessProbe` に `GET /api/healthz` を使う
  - `securityContext: runAsUser: 1001, fsGroup: 1001`（Dockerfile の非 root ユーザーと揃える）
  - `API_URL` に api の Service（例: `http://api:4000`）を設定する。web 自体は状態を持たないので、
    複数レプリカにしてよい
- `web-service.yaml` - ClusterIP Service
- `api-deployment.yaml` - apps/api の Deployment
  - `livenessProbe` に `GET /api/healthz`、`readinessProbe` に `GET /api/readyz`（DB 接続まで見る）を使う
  - `DATABASE_URL` は Secret から注入する。`DEMO_LOGIN` は付けない（本番ではデモログインを無効にする）
  - `DATA_DIR=/data` に PersistentVolumeClaim をマウントする（アップロード動画）。
    ローカルディスク保存の間は `replicas: 1` にする（複数 Pod で共有するには
    ReadWriteMany のボリュームか、オブジェクトストレージへの移行が必要）
  - 起動時にマイグレーションを流す（Job か initContainer に分けるのが望ましい）
- `api-pvc.yaml` - 動画保存用の PersistentVolumeClaim
- `api-service.yaml` - ClusterIP Service
- `ingress.yaml` - Ingress（またはお使いの Gateway）
- 将来: PostgreSQL（StatefulSet か外部 DB）、MinIO（R2 へ移すまで）

## イメージのビルド

リポジトリルートで:

```bash
docker build -f apps/web/Dockerfile -t gamingclipapp-web:dev .
docker build -f apps/api/Dockerfile -t gamingclipapp-api:dev .
```

一式をローカルで動かすには、リポジトリルートの `docker-compose.yml`（`docker compose up --build`）を使う。
