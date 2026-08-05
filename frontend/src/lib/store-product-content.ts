import sanitizeHtml from 'sanitize-html';
import { normalizeSafeText, SecurityValidationError } from './request-security.ts';

export type StoreDescriptionFormat = 'plain' | 'html';

const MAX_STORE_DESCRIPTION_LENGTH = 50_000;

const ALLOWED_TAGS = [
    'p', 'br', 'hr',
    'h2', 'h3', 'h4',
    'strong', 'b', 'em', 'i', 'u', 's', 'mark',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

export function normalizeStoreDescriptionFormat(value: unknown): StoreDescriptionFormat {
    return value === 'html' ? 'html' : 'plain';
}

export function sanitizeStoreProductDescription(
    value: unknown,
    format: StoreDescriptionFormat,
): string | null {
    if (format === 'plain') {
        return normalizeSafeText(value, {
            field: 'Descrição',
            maxLength: MAX_STORE_DESCRIPTION_LENGTH,
        });
    }

    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') throw new SecurityValidationError('Descrição inválida');
    if (value.length > MAX_STORE_DESCRIPTION_LENGTH) {
        throw new SecurityValidationError('Descrição excede o limite permitido');
    }

    const clean = sanitizeHtml(value, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
            a: ['href', 'target', 'rel'],
            th: ['colspan', 'rowspan'],
            td: ['colspan', 'rowspan'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowProtocolRelative: false,
        disallowedTagsMode: 'discard',
        enforceHtmlBoundary: true,
        transformTags: {
            a: (_tagName, attribs) => ({
                tagName: 'a',
                attribs: {
                    ...attribs,
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                },
            }),
        },
    }).trim();

    return clean || null;
}

export function plainStoreProductDescription(value: unknown): string {
    if (typeof value !== 'string' || !value) return '';
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
