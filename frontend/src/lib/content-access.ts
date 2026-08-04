import { supabase } from './db';
import { checkRateLimit, rateLimitResponse } from './rate-limit';

export async function getOwnedProduct(productId: string, userId: string) {
    const { data } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('user_id', userId)
        .limit(1);
    return data?.[0] || null;
}

export async function getOwnedModule(moduleId: string, userId: string) {
    const { data } = await supabase
        .from('product_modules')
        .select('id, product_id')
        .eq('id', moduleId)
        .limit(1);
    const module = data?.[0];
    if (!module) return null;
    return (await getOwnedProduct(module.product_id, userId)) ? module : null;
}

export async function getOwnedLesson(lessonId: string, userId: string) {
    const { data } = await supabase
        .from('product_lessons')
        .select('id, module_id')
        .eq('id', lessonId)
        .limit(1);
    const lesson = data?.[0];
    if (!lesson) return null;
    return (await getOwnedModule(lesson.module_id, userId)) ? lesson : null;
}

export async function getOwnedFile(fileId: string, userId: string) {
    const { data } = await supabase
        .from('product_files')
        .select('id, lesson_id')
        .eq('id', fileId)
        .limit(1);
    const file = data?.[0];
    if (!file) return null;
    return (await getOwnedLesson(file.lesson_id, userId)) ? file : null;
}

export async function enforceContentRateLimit(userId: string, action: 'read' | 'write') {
    const limit = action === 'write' ? 30 : 120;
    const result = await checkRateLimit({
        key: `content:${action}:${userId}`,
        limit,
        windowSecs: 60,
        // Mantém o sistema disponível se o armazenamento do limitador oscilar.
        failOpen: true,
    });
    return result.allowed ? null : rateLimitResponse(result.resetAt);
}
