const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export function asObject(body: unknown): Record<string, unknown> | null {
	return body && typeof body === 'object' && !Array.isArray(body)
		? (body as Record<string, unknown>)
		: null;
}

/** Trimmed string, or null when empty / not a string. */
export function cleanText(v: unknown): string | null {
	return typeof v === 'string' ? v.trim() || null : null;
}

/** numeric(10,2): returns "12.50", or null when invalid. */
export function parsePrice(v: unknown): string | null {
	const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
	if (!Number.isFinite(n) || n < 0 || n > 99_999_999.99) return null;
	return n.toFixed(2);
}

/** Postgres error code (works whether the driver wraps the error or not). */
export function pgCode(error: unknown): string | undefined {
	const e = error as { code?: string; cause?: { code?: string } } | null;
	return e?.code ?? e?.cause?.code;
}