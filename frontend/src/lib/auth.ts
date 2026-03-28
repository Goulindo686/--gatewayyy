import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { supabase } from './db';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined. Set it in your .env file.');
}

export function generateToken(payload: any): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): any {
    return jwt.verify(token, JWT_SECRET);
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function getAuthUser(req: NextRequest): Promise<{ user: any; error?: string } | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded: any = verifyToken(token);

        const { data: users } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.userId || decoded.id);

        const user = users?.[0];

        if (!user || user.status === 'blocked') return null;
        return { user };
    } catch {
        return null;
    }
}

export function jsonError(message: string, status: number = 400) {
    return Response.json({ error: message }, { status });
}

export function jsonSuccess(data: any, status: number = 200) {
    return Response.json(data, { status });
}
