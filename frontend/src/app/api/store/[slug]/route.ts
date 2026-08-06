export const dynamic = 'force-dynamic';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { jsonError, jsonSuccess } from '@/lib/auth';
import {
    DEFAULT_STORE_BACKGROUND,
    DEFAULT_STORE_FOOTER,
    DEFAULT_STORE_STYLE,
    normalizeStoreBackground,
    normalizeStoreFooter,
    normalizeStoreLayoutSections,
    normalizeStoreStyle
} from '@/lib/store-builder';
import {
    normalizeStoreDescriptionFormat,
    plainStoreProductDescription,
    sanitizeStoreProductDescription,
} from '@/lib/store-product-content';

const PUBLIC_STORE_FIELDS = 'id, name, store_name, store_slug, store_description, store_theme, store_banner_url, store_active, store_template, store_accent_color, store_headline, store_cta_text, store_badge_text, store_layout_sections, store_footer_config, store_background_config, store_style_config';
const BUILDER_PUBLIC_STORE_FIELDS = 'id, name, store_name, store_slug, store_description, store_theme, store_banner_url, store_active, store_template, store_accent_color, store_headline, store_cta_text, store_badge_text, store_layout_sections, store_footer_config, store_background_config';
const LEGACY_PUBLIC_STORE_FIELDS = 'id, name, store_name, store_slug, store_description, store_theme, store_banner_url, store_active, store_template, store_accent_color, store_headline, store_cta_text, store_badge_text';
// `sales_count` is intentionally omitted: it is not rendered by the storefront
// and older production schemas may not have that denormalized dashboard field.
// Keeping the public projection to fields the storefront actually consumes also
// prevents one optional analytics column from taking every store offline.
const PUBLIC_PRODUCT_FIELDS = 'id, name, description, price, price_display, image_url, type, status, show_in_store, store_category_id, store_product_slug, store_description_format, store_sort_order, created_at';

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

        // The public storefront remains available while migrations 032 or 029 are pending.
        if (userError) {
            let builderStoreQuery = supabase.from('users').select(BUILDER_PUBLIC_STORE_FIELDS);
            builderStoreQuery = customDomainOwnerId
                ? builderStoreQuery.eq('id', customDomainOwnerId)
                : builderStoreQuery.ilike('store_slug', identifier);
            const builderResult = await builderStoreQuery;
            users = builderResult.data;
            userError = builderResult.error;
        }

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
        let categoriesResult = await supabase
            .from('store_categories')
            .select('*')
            .eq('user_id', user.id)
            .order('sort_order', { ascending: true })
            .order('name');
        if (categoriesResult.error && /sort_order/i.test(categoriesResult.error.message || '')) {
            categoriesResult = await supabase
                .from('store_categories')
                .select('*')
                .eq('user_id', user.id)
                .order('name');
        }
        const categories = categoriesResult.data;

        // 3. Get products
        let query = supabase
            .from('products')
            .select(PUBLIC_PRODUCT_FIELDS)
            .eq('user_id', user.id)
            .in('sales_channel', ['store', 'checkout'])
            .eq('status', 'active')
            .eq('type', 'digital')
            .eq('show_in_store', true)
            .order('store_sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (categorySlug) {
            const category = categories?.find(c => c.slug === categorySlug);
            if (category) {
                query = query.eq('store_category_id', category.id);
            }
        }

        let { data: products, error: prodError } = await query;
        if (prodError && /store_sort_order/i.test(prodError.message || '')) {
            let fallbackQuery = supabase
                .from('products')
                .select(PUBLIC_PRODUCT_FIELDS.replace(', store_sort_order', ''))
                .eq('user_id', user.id)
                .in('sales_channel', ['store', 'checkout'])
                .eq('status', 'active')
                .eq('type', 'digital')
                .eq('show_in_store', true)
                .order('created_at', { ascending: false });
            if (categorySlug) {
                const category = categories?.find(c => c.slug === categorySlug);
                if (category) fallbackQuery = fallbackQuery.eq('store_category_id', category.id);
            }
            const fallback = await fallbackQuery;
            products = fallback.data;
            prodError = fallback.error;
        }

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
                const safeDescription = sanitizeStoreProductDescription(
                    p.description,
                    normalizeStoreDescriptionFormat(p.store_description_format),
                );
                return {
                    ...p,
                    description: safeDescription,
                    description_text: plainStoreProductDescription(safeDescription),
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
                accent_color: user.store_accent_color || '#6c5ce7',
                headline: user.store_headline || user.store_name,
                cta_text: user.store_cta_text || 'Ver produtos',
                badge_text: user.store_badge_text || 'Produtos digitais com acesso online',
                layout_sections: normalizeStoreLayoutSections(user.store_layout_sections),
                footer: normalizeStoreFooter(user.store_footer_config || DEFAULT_STORE_FOOTER),
                background: normalizeStoreBackground(user.store_background_config || DEFAULT_STORE_BACKGROUND),
                style: normalizeStoreStyle(user.store_style_config || DEFAULT_STORE_STYLE)
            },
            categories: categories || [],
            products: formattedProducts
        });
    } catch (err) {
        console.error('Store loading error:', err);
        return jsonError('Erro ao carregar loja', 500);
    }
}
