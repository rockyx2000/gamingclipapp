# Kubernetes マニフェスト（予定地）

本番運用フェーズで、自宅 Kubernetes クラスタ向けのマニフェストをここに置く。

## 想定する構成

- `web-deployment.yaml` - apps/web の Deployment
  - `livenessProbe` / `readinessProbe` に `GET /api/healthz` を使う
  - `securityContext: runAsUser: 1001, fsGroup: 1001`（Dockerfile の非 root ユーザーと揃える）
  - `DATA_DIR=/data` に PersistentVolumeClaim をマウントする（アップロード動画と clips.json）
  - ローカルディスク保存の間は `replicas: 1` にする（複数 Pod で共有するには
    ReadWriteMany のボリュームか、オブジェクトストレージへの移行が必要）
- `web-pvc.yaml` - 動画保存用の PersistentVolumeClaim
- `web-service.yaml` - ClusterIP Service
- `ingress.yaml` - Ingress（またはお使いの Gateway）
- 将来: `api-deployment.yaml`、PostgreSQL（StatefulSet か外部 DB）、MinIO

## イメージのビルド

リポジトリルートで:

```bash
docker build -f apps/web/Dockerfile -t gamingclipapp-web:dev .
docker run --rm -p 3000:3000 -v gamingclipapp-data:/data gamingclipapp-web:dev
```
