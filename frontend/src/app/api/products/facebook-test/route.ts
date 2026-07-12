import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { normalizeFacebookSettings, sendFacebookEvent } from '@/lib/facebook-capi';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Nao autorizado', 401);

    try {
        const body = await req.json();
        const settings = normalizeFacebookSettings(body);
        const product = {
            id: body.product_id || 'test-product',
            name: body.product_name || 'Teste de Pixel',
            price: 1,
            facebook_pixel_id: settings.facebook_pixel_id,
            facebook_api_token: settings.facebook_api_token
        };

        if (!product.facebook_pixel_id) return jsonError('Informe um Pixel ID valido.');
        if (!product.facebook_api_token || String(product.facebook_api_token).length < 20) {
            return jsonError('Informe um Access Token valido.');
        }

        const result = await sendFacebookEvent({
            eventName: 'PageView',
            product,
            buyer: { email: auth.user.email, name: auth.user.name },
            eventId: `test_${Date.now()}`,
            eventSourceUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://goupay.com.br'}/checkout/${product.id}`,
            testEventCode: body.test_event_code
        });

        if ((result as any).ok) {
            return jsonSuccess({ message: 'Evento de teste enviado ao Meta.', result });
        }

        return jsonError((result as any).error || 'Nao foi possivel testar o Pixel.', 400);
    } catch (err: any) {
        return jsonError(err?.message || 'Erro ao testar Pixel.', 500);
    }
}
