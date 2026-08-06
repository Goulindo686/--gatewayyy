export const dynamic = 'force-dynamic';

import { jsonError } from '@/lib/auth';
import { withSupportResponseHeaders } from '@/lib/support';

export async function POST() {
    return withSupportResponseHeaders(
        jsonError('Crie ou entre na sua conta GouPay para abrir suporte.', 401),
    );
}
