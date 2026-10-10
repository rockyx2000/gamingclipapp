# 0005 認証は暫定のデモログイン。本命は Cloudflare 経由の Google OAuth

## 背景
認証の本実装は k8s への移行時に、Cloudflare 経由の Google OAuth で行う予定。それまでユーザー機能を作り込みたくない。

## 決定
ユーザー名だけで入れるデモログインを置く。`sessions` テーブルと Cookie `gca_session`（httpOnly、SameSite=Lax、7 日）で管理する。有効なのは `DEMO_LOGIN=true` か `NODE_ENV!=production` のときだけ。

## 結果
- パスワード検証が無いので、本番では使わない。
- パスワードや独自のセッション管理の作り込みは足さない。
- 通知やフォローなどのユーザー機能は、OAuth 導入後に回す。
