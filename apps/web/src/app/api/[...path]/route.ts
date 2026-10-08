import { proxyToApi } from "@/lib/api";

// /api/healthz 以外の /api/... は、すべて apps/api へそのまま転送する。
// ブラウザは web の URL だけを見ていればよく、Cookie も同じオリジンのまま使える。
// 本文とレスポンスはストリームのまま流すので、動画のアップロードや Range 付きの配信も通る。

export const dynamic = "force-dynamic";

export const GET = (request: Request) => proxyToApi(request);
export const POST = (request: Request) => proxyToApi(request);
export const PUT = (request: Request) => proxyToApi(request);
export const PATCH = (request: Request) => proxyToApi(request);
export const DELETE = (request: Request) => proxyToApi(request);
