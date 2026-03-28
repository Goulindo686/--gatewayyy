export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
        return NextResponse.json({ error: 'VAPID nao configurado' }, { status: 500 });
    }
    return NextResponse.json({ publicKey });
}
