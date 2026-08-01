export const EDGE_DOMAIN_HOST_HEADER = 'x-goupay-custom-host';
export const EDGE_DOMAIN_TIMESTAMP_HEADER = 'x-goupay-edge-timestamp';
export const EDGE_DOMAIN_SIGNATURE_HEADER = 'x-goupay-edge-signature';

const MAX_SIGNATURE_AGE_SECONDS = 300;

function signaturePayload(method: string, hostname: string, pathWithSearch: string, timestamp: string): string {
    return [method.toUpperCase(), hostname.toLowerCase(), pathWithSearch, timestamp].join('\n');
}

function bytesToHex(bytes: ArrayBuffer): string {
    return [...new Uint8Array(bytes)]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function calculateSignature(
    secret: string,
    method: string,
    hostname: string,
    pathWithSearch: string,
    timestamp: string
): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(signaturePayload(method, hostname, pathWithSearch, timestamp))
    );
    return bytesToHex(signature);
}

function safeEqual(left: string, right: string): boolean {
    if (left.length !== right.length || left.length === 0) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
        difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return difference === 0;
}

export async function verifyEdgeDomainSignature(input: {
    secret: string;
    method: string;
    hostname: string;
    pathWithSearch: string;
    timestamp: string;
    signature: string;
    nowSeconds?: number;
}): Promise<boolean> {
    const timestampNumber = Number(input.timestamp);
    const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(timestampNumber)) return false;
    if (Math.abs(nowSeconds - timestampNumber) > MAX_SIGNATURE_AGE_SECONDS) return false;
    if (!/^[a-f0-9]{64}$/i.test(input.signature)) return false;

    const expected = await calculateSignature(
        input.secret,
        input.method,
        input.hostname,
        input.pathWithSearch,
        input.timestamp
    );
    return safeEqual(expected, input.signature.toLowerCase());
}
