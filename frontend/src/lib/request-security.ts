import type { NextRequest } from 'next/server';

export class SecurityValidationError extends Error {}

const DANGEROUS_MARKUP = [
    /<\s*\/?\s*(script|iframe|object|embed|svg|math|meta|link|base|form|input|button|textarea|style)\b/i,
    /\bon[a-z]+\s*=/i,
    /(?:javascript|vbscript)\s*:/i,
    /data\s*:\s*text\/html/i,
];

export function normalizeSafeText(
    value: unknown,
    options: { field: string; maxLength: number; required?: boolean },
): string | null {
    if (value === undefined || value === null) {
        if (options.required) throw new SecurityValidationError(`${options.field} é obrigatório`);
        return null;
    }
    if (typeof value !== 'string') throw new SecurityValidationError(`${options.field} inválido`);

    const normalized = value.trim();
    if (options.required && !normalized) throw new SecurityValidationError(`${options.field} é obrigatório`);
    if (normalized.length > options.maxLength) {
        throw new SecurityValidationError(`${options.field} excede o limite permitido`);
    }
    if (DANGEROUS_MARKUP.some((pattern) => pattern.test(normalized))) {
        throw new SecurityValidationError(`${options.field} contém conteúdo não permitido`);
    }
    return normalized || null;
}

export function normalizeHttpUrl(
    value: unknown,
    options: { field: string; maxLength?: number; required?: boolean },
): string | null {
    const normalized = normalizeSafeText(value, {
        field: options.field,
        maxLength: options.maxLength || 2048,
        required: options.required,
    });
    if (!normalized) return null;

    try {
        const parsed = new URL(normalized);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
            throw new Error('invalid protocol');
        }
        return parsed.toString();
    } catch {
        throw new SecurityValidationError(`${options.field} deve ser uma URL HTTP(S) válida`);
    }
}

export function normalizeOrder(value: unknown, fallback = 0): number {
    if (value === undefined || value === null || value === '') return fallback;
    const order = Number(value);
    if (!Number.isSafeInteger(order) || order < 0 || order > 100_000) {
        throw new SecurityValidationError('Ordem inválida');
    }
    return order;
}

export function requestBodyTooLarge(req: NextRequest, maxBytes: number): boolean {
    const rawLength = req.headers.get('content-length');
    if (!rawLength) return false;
    const length = Number(rawLength);
    return Number.isFinite(length) && length > maxBytes;
}
