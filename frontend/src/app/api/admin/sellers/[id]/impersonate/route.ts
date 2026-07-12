import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthUser, jsonError, jsonSuccess, generateToken } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await getAuthUser(req);
    if (!auth || auth.user.role !== 'admin') return jsonError('Nao autorizado', 403);

    try {
        const body = await req.json().catch(() => ({}));
        const reason = String(body.reason || '').trim();
        if (reason.length < 8) {
            return jsonError('Informe um motivo com pelo menos 8 caracteres para acessar como vendedor', 400);
        }

        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            'unknown';
        const rl = await checkRateLimit({ key: `admin:impersonate:${auth.user.id}:${ip}`, limit: 5, windowSecs: 3600, failOpen: true });
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, role, status, avatar_url')
            .eq('id', id)
            .single();

        if (error || !user) return jsonError('Usuario nao encontrado', 404);
        if (user.role === 'admin') return jsonError('Nao e permitido acessar como outro admin', 403);
        if (user.status === 'blocked') return jsonError('Nao e permitido acessar uma conta bloqueada', 403);

        const audit = await supabase.from('admin_audit_logs').insert({
            admin_id: auth.user.id,
            target_user_id: user.id,
            action: 'impersonate_seller',
            reason,
            ip_address: ip,
            user_agent: req.headers.get('user-agent') || null
        });
        if (audit.error) {
            console.warn('[ADMIN AUDIT] Falha ao registrar impersonacao:', audit.error.message);
        }

        const token = generateToken({
            userId: user.id,
            role: user.role,
            impersonated_by: auth.user.id
        });

        return jsonSuccess({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url },
            message: `Sessao iniciada como ${user.name}`
        });
    } catch {
        return jsonError('Erro interno', 500);
    }
}
