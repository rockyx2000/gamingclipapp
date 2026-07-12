// Kubernetes の liveness / readiness プローブ用エンドポイント

export async function GET() {
  return Response.json({ status: "ok" });
}
