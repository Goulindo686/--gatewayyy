export const dynamic = 'force-dynamic';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { getAuthUser, jsonError, jsonSuccess } from '@/lib/auth';
import { supabase } from '@/lib/db';
import {
    collectStoreProductIds,
    DEFAULT_STORE_BACKGROUND,
    DEFAULT_STORE_FOOTER,
    DEFAULT_STORE_STYLE,
    normalizeStoreBackground,
    normalizeStoreFooter,
    normalizeStoreLayoutSections,
    normalizeStoreStyle,
    normalizeStoreUrl,
    StoreBuilderValidationError
} from '@/lib/store-builder';

const STORE_FIELDS = [
    'store_active',
    'store_name',
    'store_slug',
    'store_description',
    'store_theme',
    'store_banner_url',
    'store_template',
    'store_accent_color',
    'store_headline',
    'store_cta_text',
    'store_badge_text',
    'store_layout_sections',
    'store_footer_config',
    'store_background_config',
    'store_style_config'
].join(', ');

const BUILDER_STORE_FIELDS = [
    'store_active',
    'store_name',
    'store_slug',
    'store_description',
    'store_theme',
    'store_banner_url',
    'store_template',
    'store_accent_color',
    'store_headline',
    'store_cta_text',
    'store_badge_text',
    'store_layout_sections',
    'store_footer_config',
    'store_background_config'
].join(', ');

const LEGACY_STORE_FIELDS = [
    'store_active',
    'store_name',
    'store_slug',
    'store_description',
    'store_theme',
    'store_banner_url',
    'store_template',
    'store_accent_color',
    'store_headline',
    'store_cta_text',
    'store_badge_text'
].join(', ');

function cleanText(value: unknown, maxLength: number): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanSlug(value: unknown): string {
    return cleanText(value, 64)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function cleanColor(value: unknown): string {
    const normalized = cleanText(value, 20);
    return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : '#c45c3e';
}

function formatStore(row: any, migrationFile = '') {
    return {
        store_active: Boolean(row?.store_active),
        store_name: row?.store_name || '',
        store_slug: row?.store_slug || '',
        store_description: row?.store_description || '',
        store_theme: row?.store_theme || 'light',
        store_banner_url: row?.store_banner_url || '',
        store_template: row?.store_template || 'creator',
        store_accent_color: row?.store_accent_color || '#c45c3e',
        store_headline: row?.store_headline || '',
        store_cta_text: row?.store_cta_text || 'Ver produtos',
        store_badge_text: row?.store_badge_text || 'Uma seleção feita para você',
        store_layout_sections: normalizeStoreLayoutSections(row?.store_layout_sections),
        store_footer_config: normalizeStoreFooter(row?.store_footer_config || DEFAULT_STORE_FOOTER),
        store_background_config: normalizeStoreBackground(row?.store_background_config || DEFAULT_STORE_BACKGROUND),
        store_style_config: normalizeStoreStyle(row?.store_style_config || DEFAULT_STORE_STYLE),
        migration_required: Boolean(migrationFile),
        migration_file: migrationFile
    };
}

async function getStoreRow(userId: string) {
    const fullQuery = await supabase
        .from('users')
        .select(STORE_FIELDS)
        .eq('id', userId);

    if (!fullQuery.error) {
        return { row: fullQuery.data?.[0], migrationFile: '', error: null };
    }

    const builderQuery = await supabase
        .from('users')
        .select(BUILDER_STORE_FIELDS)
        .eq('id', userId);

    if (!builderQuery.error) {
        return { row: builderQuery.data?.[0], migrationFile: '032_add_store_style_config.sql', error: null };
    }

    const legacyQuery = await supabase
        .from('users')
        .select(LEGACY_STORE_FIELDS)
        .eq('id', userId);

    return {
        row: legacyQuery.data?.[0],
        migrationFile: '029_add_storefront_builder.sql',
        error: legacyQuery.error
    };
}

export async function GET(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    const [{ row, migrationFile, error }, productsQuery] = await Promise.all([
        getStoreRow(auth.user.id),
        supabase
            .from('products')
            .select('id, name, image_url, status, show_in_store, type')
            .eq('user_id', auth.user.id)
            .eq('type', 'digital')
            .order('created_at', { ascending: false })
    ]);

    if (error || !row) {
        console.error('Store builder load error:', error);
        return jsonError('Erro ao carregar a configuração da loja', 500);
    }
    if (productsQuery.error) {
        console.error('Store builder products error:', productsQuery.error);
        return jsonError('Erro ao carregar os produtos da loja', 500);
    }

    return jsonSuccess({
        store: formatStore(row, migrationFile),
        products: productsQuery.data || []
    });
}

export async function PUT(req: NextRequest) {
    const auth = await getAuthUser(req);
    if (!auth) return jsonError('Não autorizado', 401);

    try {
        const body = await req.json();
        const storeName = cleanText(body.store_name, 100);
        const storeSlug = cleanSlug(body.store_slug);
        if (!storeName) return jsonError('Informe o nome da loja');
        if (!storeSlug) return jsonError('Informe um link válido para a loja');

        const sections = normalizeStoreLayoutSections(body.store_layout_sections, { strict: true });
        const footer = normalizeStoreFooter(body.store_footer_config, { strict: true });
        const background = normalizeStoreBackground(body.store_background_config, { strict: true });
        const style = normalizeStoreStyle(body.store_style_config, { strict: true });
        const selectedProductIds = collectStoreProductIds(sections);

        if (selectedProductIds.length > 0) {
            const { data: ownedProducts, error: productsError } = await supabase
                .from('products')
                .select('id')
                .eq('user_id', auth.user.id)
                .in('id', selectedProductIds);

            if (productsError) {
                console.error('Store builder ownership validation error:', productsError);
                return jsonError('Não foi possível validar os produtos selecionados', 500);
            }

            const ownedIds = new Set((ownedProducts || []).map(product => String(product.id)));
            if (selectedProductIds.some(productId => !ownedIds.has(productId))) {
                return jsonError('Um ou mais produtos selecionados não pertencem à sua conta', 403);
            }
        }

        const { data: slugOwners, error: slugError } = await supabase
            .from('users')
            .select('id')
            .ilike('store_slug', storeSlug)
            .neq('id', auth.user.id)
            .limit(1);

        if (slugError) {
            console.error('Store slug validation error:', slugError);
            return jsonError('Não foi possível validar o link da loja', 500);
        }
        if ((slugOwners || []).length > 0) return jsonError('Este link de loja já está em uso', 409);

        const template = ['creator', 'academy', 'studio'].includes(body.store_template)
            ? body.store_template
            : 'creator';

        const updateData = {
            store_active: Boolean(body.store_active),
            store_name: storeName,
            store_slug: storeSlug,
            store_description: cleanText(body.store_description, 600),
            store_theme: body.store_theme === 'dark' ? 'dark' : 'light',
            store_banner_url: normalizeStoreUrl(body.store_banner_url, { strict: Boolean(body.store_banner_url) }),
            store_template: template,
            store_accent_color: cleanColor(body.store_accent_color),
            store_headline: cleanText(body.store_headline, 140) || storeName,
            store_cta_text: cleanText(body.store_cta_text, 40) || 'Ver produtos',
            store_badge_text: cleanText(body.store_badge_text, 60) || 'Uma seleção feita para você',
            store_layout_sections: sections,
            store_footer_config: footer,
            store_background_config: background,
            store_style_config: style
        };

        const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', auth.user.id);

        if (updateError) {
            console.error('Store builder save error:', updateError);
            const missingStyleMigration = /store_style_config/i.test(updateError.message || '');
            if (missingStyleMigration) {
                return jsonError('Execute a migration 032_add_store_style_config.sql no Supabase antes de salvar.', 503);
            }
            const missingMigration = /store_(layout_sections|footer_config|background_config)/i.test(updateError.message || '');
            if (missingMigration) {
                return jsonError('Execute a migration 029_add_storefront_builder.sql no Supabase antes de salvar.', 503);
            }
            return jsonError('Erro ao salvar a loja: ' + updateError.message, 500);
        }

        return jsonSuccess({ store: formatStore(updateData), message: 'Loja atualizada com sucesso' });
    } catch (error) {
        if (error instanceof StoreBuilderValidationError) return jsonError(error.message);
        console.error('Store builder update error:', error);
        return jsonError('Erro interno ao salvar a loja', 500);
    }
}
