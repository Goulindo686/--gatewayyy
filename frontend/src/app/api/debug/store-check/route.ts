export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { jsonError } from '@/lib/auth';

export async function GET(_req: NextRequest) {
    return jsonError('Not found', 404);
}
