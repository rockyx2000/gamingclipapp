/** ステータス付きのエラー。ルートでそのままレスポンスにする */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 403 | 404 | 413 | 500,
  ) {
    super(message);
  }
}
