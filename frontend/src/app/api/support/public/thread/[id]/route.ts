export const dynamic = 'force-dynamic';

import { jsonError } from '@/lib/auth';

export async function GET() {
    return jsonError('Entre na sua conta GouPay para acessar este atendimento.', 401);
}

export async function POST() {
    return jsonError('Entre na sua conta GouPay para responder este atendimento.', 401);
}
