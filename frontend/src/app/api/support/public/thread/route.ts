export const dynamic = 'force-dynamic';

import { jsonError } from '@/lib/auth';

export async function POST() {
    return jsonError('Crie ou entre na sua conta GouPay para abrir suporte.', 401);
}
