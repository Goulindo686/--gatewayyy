import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id'); // Assuming middleware sets this or we check auth
        // Actually, we should use session/token auth here properly
        // For simplicity, let's assume client sends Authorization header and we validate it

        // But wait, the frontend calls this via authenticated session.
        // Let's use supabase auth helper if available or verify token
        // Since we are in Next.js App Router, let's assume client-side supabase sends auth header
        
        // Simpler: Just get user from header if middleware sets it, or use supabase.auth.getUser()
        
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: keys, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ keys });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

        return NextResponse.json({ key: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
