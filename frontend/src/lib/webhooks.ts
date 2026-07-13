export function normalizeWebhookUrls(value: unknown, fallback?: unknown): string[] {
    const values: string[] = [];

    const collect = (input: unknown) => {
        if (!input) return;
        if (Array.isArray(input)) {
            input.forEach(collect);
            return;
        }
        if (typeof input === 'string') {
            input
                .split(/\r?\n|,/)
                .map((url) => url.trim())
                .filter(Boolean)
                .forEach((url) => values.push(url));
        }
    };

    collect(value);
    if (values.length === 0) collect(fallback);

    return Array.from(new Set(values));
}

export async function sendWebhookPayload(url: string, payload: unknown) {
    const startTime = Date.now();
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const duration = Date.now() - startTime;
    const text = response.ok ? '' : await response.text().catch(() => '');

    return {
        url,
        ok: response.ok,
        status: response.status,
        duration,
        error: response.ok ? null : text.slice(0, 200),
    };
}
