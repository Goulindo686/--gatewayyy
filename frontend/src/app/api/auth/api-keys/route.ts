import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth || !auth.user) {
            return jsonError('Não autorizado', 401);
        }
        const user = auth.user;

        const { data: keys, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return jsonSuccess({ keys });
    } catch (error: any) {
        return jsonError(error.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthUser(req);
        if (!auth || !auth.user) {
            return jsonError('Não autorizado', 401);
        }
        const user = auth.user;

        const newKey = 'gou_live_' + uuidv4().replace(/-/g, '');
        
        const { data, error } = await supabase
            .from('api_keys')
            .insert({
                user_id: user.id,
                api_key: newKey,
                key_type: 'live'
            })
            .select()
            .single();

        if (error) throw error;

        return jsonSuccess({ key: data });
    } catch (error: any) {
        return jsonError(error.message, 500);
    }
}
