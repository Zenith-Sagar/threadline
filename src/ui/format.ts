export const r0 = (n: number): string => String(Math.round(n));
export const money = (n: number): string => `$${Math.round(n)}M`;
export const pct = (frac: number): string => `${Math.round(frac * 100)}%`;
export const signedPct = (frac: number): string => `${frac >= 0 ? '+' : '-'}${Math.abs(Math.round(frac * 100))}%`;
export const signed = (n: number): string => `${n >= 0 ? '+' : '-'}${Math.abs(Math.round(n))}`;
