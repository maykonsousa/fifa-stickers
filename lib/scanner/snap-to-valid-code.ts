export interface SnapResult {
  code: string;
  distance: number;
}

function normalize(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

// Tolerância de erro proporcional ao tamanho do código:
// códigos curtos (<=4) aceitam 1 erro; mais longos aceitam 2.
function maxDistanceFor(code: string): number {
  return code.length <= 4 ? 1 : 2;
}

export function snapToValidCode(raw: string, validCodes: string[]): SnapResult | null {
  const cleaned = normalize(raw);
  if (cleaned.length === 0) return null;

  let best: SnapResult | null = null;
  for (const code of validCodes) {
    const distance = levenshtein(cleaned, code);
    if (distance > maxDistanceFor(code)) continue;
    if (best === null || distance < best.distance) {
      best = { code, distance };
      if (distance === 0) break;
    }
  }
  return best;
}
