// クリップの映像の上に付けるタグの位置の計算。
// タグの位置は「映像のコマ」に対する割合（0〜1）で持つ。画面には黒帯付き（object-fit: contain）で
// 映るので、表示するときは、まず映像が実際に映っている長方形を求めて、その中に置く。

export interface ContentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * boxW x boxH の枠に、縦横比 aspect（幅 / 高さ）の映像を contain で収めたときの長方形。
 * 縦横比が分からない（まだ読み込んでいない）ときは、枠いっぱいとして扱う。
 */
export function containRect(boxW: number, boxH: number, aspect: number | undefined): ContentRect {
  if (!aspect || !Number.isFinite(aspect) || boxW <= 0 || boxH <= 0) {
    return { left: 0, top: 0, width: boxW, height: boxH };
  }
  const boxAspect = boxW / boxH;
  if (boxAspect > aspect) {
    const width = boxH * aspect;
    return { left: (boxW - width) / 2, top: 0, width, height: boxH };
  }
  const height = boxW / aspect;
  return { left: 0, top: (boxH - height) / 2, width: boxW, height };
}

export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
