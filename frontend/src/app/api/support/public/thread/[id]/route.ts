export const dynamic = 'force-dynamic';

import { jsonError } from '@/lib/auth';
import { withSupportResponseHeaders } from '@/lib/support';

export async function GET() {
    return withSupportResponseHeaders(
        jsonError('Entre na sua conta GouPay para acessar este atendimento.', 401),
    );
}

export async function POST() {
    return withSupportResponseHeaders(
        jsonError('Entre na sua conta GouPay para responder este atendimento.', 401),
    );
}
