export const dynamic = 'force-dynamic';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import {
    DEFAULT_STORE_BACKGROUND,
    DEFAULT_STORE_FOOTER,
    normalizeStoreBackground,
    normalizeStoreFooter,
    normalizeStoreLayoutSections
} from '@/lib/store-builder';

const PUBLIC_STORE_FIELDS = 'id, name, store_name, store_slug, store_description, store_theme, store_banner_url, store_active, store_template, store_accent_color, store_headline, store_cta_text, store_badge_text, store_layout_sections, store_footer_config, store_background_config';
const LEGACY_PUBLIC_STORE_FIELDS = 'id, name, store_name, store_slug, store_description, store_theme, store_banner_url, store_active, store_template, store_accent_color, store_headline, store_cta_text, store_badge_text';

function isMissingCustomDomainTable(error: { code?: string; message?: string } | null): boolean {
    return error?.code === '42P01'
        || error?.code === 'PGRST205'
        || /store_custom_domains/i.test(error?.message || '');
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const identifier = slug.toLowerCase().replace(/\.$/, '');
    const categorySlug = req.nextUrl.searchParams.get('category');

    try {
        // 1. Get store owner info
        // A verified custom domain resolves to its owner. The original /store/slug URL
        // remains the fallback and continues using the existing lookup.
        let customDomainOwnerId: string | null = null;
        if (identifier.includes('.')) {
            const mapping = await supabase
                .from('store_custom_domains')
                .select('user_id')
                .ilike('domain', identifier)
                .eq('status', 'active')
                .eq('verified', true)
                .limit(1);

            if (mapping.error && !isMissingCustomDomainTable(mapping.error)) {
                console.error('Custom domain lookup error:', mapping.error);
                return jsonError('Erro ao buscar loja', 500);
            }
            customDomainOwnerId = mapping.data?.[0]?.user_id || null;
            if (!customDomainOwnerId) return jsonError('Loja não encontrada', 404);
        }

        let fullStoreQuery = supabase.from('users').select(PUBLIC_STORE_FIELDS);
        fullStoreQuery = customDomainOwnerId
            ? fullStoreQuery.eq('id', customDomainOwnerId)
            : fullStoreQuery.ilike('store_slug', identifier);
        const fullStoreResult = await fullStoreQuery;
        let users: any[] | null = fullStoreResult.data as any[] | null;
        let userError = fullStoreResult.error;

        // The public storefront remains available while migration 029 is pending.
        if (userError) {
            let legacyStoreQuery = supabase.from('users').select(LEGACY_PUBLIC_STORE_FIELDS);
            legacyStoreQuery = customDomainOwnerId
                ? legacyStoreQuery.eq('id', customDomainOwnerId)
                : legacyStoreQuery.ilike('store_slug', identifier);
            const legacyResult = await legacyStoreQuery;
            users = legacyResult.data;
            userError = legacyResult.error;
        }

        if (userError) {
            console.error('Supabase user slug error:', userError);
            return jsonError('Erro ao buscar loja', 500);
        }

        if (!users || users.length === 0) {
            console.log(`Store not found for slug: ${slug}`);
            return jsonError('Loja não encontrada', 404);
        }

        const user = users[0];

        if (!user.store_active) {
            console.log(`Store found but inactive for slug: ${slug}`);
            return jsonError('Loja inativa', 404);
        }

        // 2. Get categories
        const { data: categories } = await supabase
            .from('store_categories')
            .select('*')
            .eq('user_id', user.id)
            .order('name');

        // 3. Get products
        let query = supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .eq('type', 'digital')
            .eq('show_in_store', true)
            .order('created_at', { ascending: false });

        if (categorySlug) {
            const category = categories?.find(c => c.slug === categorySlug);
            if (category) {
                query = query.eq('store_category_id', category.id);
            }
        }

        const { data: products, error: prodError } = await query;

        if (prodError) throw prodError;

        let formattedProducts: any[] = [];
        if (products && products.length > 0) {
            const productIds = products.map(p => p.id);
            const { data: plans, error: plansError } = await supabase
                .from('product_plans')
                .select('id, product_id, name, price, sort_order')
                .in('product_id', productIds)
                .order('sort_order', { ascending: true });

            if (plansError) {
                console.error('Error fetching plans:', plansError);
            }
            const plansByProduct: Record<string, any[]> = {};
            (plans || []).forEach(p => {
                if (!plansByProduct[p.product_id]) plansByProduct[p.product_id] = [];
                plansByProduct[p.product_id].push(p);
            });
            formattedProducts = products.map(p => {
                const plansFor = plansByProduct[p.id] || [];
                const candidate = plansFor.length > 0 ? plansFor[0] : null;
                const eff = candidate ? candidate.price : p.price;
                return {
                    ...p,
                    price: eff / 100,
                    price_display: (eff / 100).toFixed(2),
                    has_plans: plansFor.length > 1,
                    plans: plansFor.map(x => ({ ...x, price_display: (x.price / 100).toFixed(2) }))
                };
            });
        }

        return jsonSuccess({
            store: {
                slug: user.store_slug,
                name: user.store_name,
                description: user.store_description,
                theme: user.store_theme || 'light',
                banner_url: user.store_banner_url,
                template: user.store_template || 'creator',
                accent_color: user.store_accent_color || '#c45c3e',
                headline: user.store_headline || user.store_name,
                cta_text: user.store_cta_text || 'Ver produtos',
                badge_text: user.store_badge_text || 'Uma seleção feita para você',
                layout_sections: normalizeStoreLayoutSections(user.store_layout_sections),
                footer: normalizeStoreFooter(user.store_footer_config || DEFAULT_STORE_FOOTER),
                background: normalizeStoreBackground(user.store_background_config || DEFAULT_STORE_BACKGROUND)
            },
            categories: categories || [],
            products: formattedProducts
        });
    } catch (err) {
        console.error('Store loading error:', err);
        return jsonError('Erro ao carregar loja', 500);
    }
}
