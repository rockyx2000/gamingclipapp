# 0003 k8s へ移すまでは docker compose で動かす

## 背景
ホストへの Node.js の導入が面倒。k8s（自宅クラスタ）への移行はまだ先。

## 決定
`docker compose up --build` で db（postgres:17）・api・web を起動する。api は起動のたびに migrate → seed → serve を行う。開発中は api と db だけ Docker で立て、web をホストの `npm run dev` で動かす。

## 結果
- ホストに必要なのは Docker だけ。
- ホットリロードは Docker 側には無い。
- Docker の VM が 2GB だと web のビルドが `cannot allocate memory` で落ちる。他のコンテナを止めてからビルドする。
