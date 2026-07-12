import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { supabase } from './db';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined. Set it in your .env file.');
}
const SECRET = JWT_SECRET as string;

export type AuthTokenPayload = JwtPayload & { impersonated_by?: string; userId?: string; id?: string; role?: string };

export function generateToken(payload: any): string {
    return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): any {
    return jwt.verify(token, SECRET);
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function getAuthUser(req: NextRequest): Promise<{ user: any; tokenPayload?: AuthTokenPayload; error?: string } | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token) as AuthTokenPayload;

        const { data: users } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.userId || decoded.id);

        const user = users?.[0];

        if (!user || user.status === 'blocked') return null;
        return { user, tokenPayload: decoded };
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
