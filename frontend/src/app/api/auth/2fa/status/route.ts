export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { recoveryCodeCount } from '@/lib/two-factor';

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    const response = jsonSuccess({
        enabled: auth.user.two_factor_enabled === true,
        confirmed_at: auth.user.two_factor_confirmed_at || null,
        recovery_codes_remaining: recoveryCodeCount(auth.user.two_factor_recovery_codes),
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
}
