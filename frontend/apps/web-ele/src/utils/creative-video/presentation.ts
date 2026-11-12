export interface CanvasPoint {
  x: number;
  y: number;
}

export function sanitizeCanvasPoint(input: any): CanvasPoint {
  const x = Number(input?.x);
  const y = Number(input?.y);
  return {
    x: Number.isFinite(x) ? Math.max(-200, Math.min(200, x)) : 0,
    y: Number.isFinite(y) ? Math.max(-120, Math.min(240, y)) : 0,
  };
}

export function sanitizeLayout(
  layout: Record<string, any> | undefined,
): Record<string, CanvasPoint> {
  const result: Record<string, CanvasPoint> = {};
  for (const [id, point] of Object.entries(layout ?? {})) {
    result[id] = sanitizeCanvasPoint(point);
  }
  return result;
}
