const { supabase } = require('../config/database');

class OrderBumpController {
    /**
     * Lista os order bumps de um produto (autenticado — dono do produto)
     */
    async list(req, res, next) {
        try {
            const { product_id } = req.params;

            // Verifica que o produto pertence ao usuário
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('id')
                .eq('id', product_id)
                .eq('user_id', req.user.id)
                .single();

            if (productError || !product) {
                return res.status(404).json({ error: 'Produto não encontrado.' });
            }

            const { data, error } = await supabase
                .from('order_bumps')
                .select(`
                    *,
                    bump_product:bump_product_id (
                        id, name, price, image_url,
                        plans:product_plans (id, name, price, sort_order)
                    ),
                    bump_plan:bump_plan_id (id, name, price)
                `)
                .eq('product_id', product_id)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            res.json({ order_bumps: data || [] });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Retorna os order bumps públicos de um produto (para o checkout)
     */
    async listPublic(req, res, next) {
        try {
            const { product_id } = req.params;

            const { data, error } = await supabase
                .from('order_bumps')
                .select(`
                    id, title, description, call_to_action,
                    custom_price, badge_text, badge_color, sort_order,
                    bump_product:bump_product_id (
                        id, name, price, image_url,
                        plans:product_plans (id, name, price, sort_order)
                    ),
                    bump_plan:bump_plan_id (id, name, price)
                `)
                .eq('product_id', product_id)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            // Calcula o preço efetivo de cada bump
            const bumps = (data || []).map(bump => {
                let effectivePrice = bump.custom_price;
                if (!effectivePrice) {
                    if (bump.bump_plan) {
                        effectivePrice = bump.bump_plan.price;
                    } else if (bump.bump_product) {
                        effectivePrice = bump.bump_product.price;
                    }
                }
                return {
                    ...bump,
                    effective_price: effectivePrice,
                    effective_price_display: effectivePrice ? (effectivePrice / 100).toFixed(2) : null
                };
            });

            res.json({ order_bumps: bumps });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cria um novo order bump
     */
    async create(req, res, next) {
        try {
            const { product_id } = req.params;
            const {
                bump_product_id,
                bump_plan_id,
                title,
                description,
                call_to_action,
                custom_price,
                badge_text,
                badge_color,
                sort_order
            } = req.body;

            // Verifica que o produto pertence ao usuário
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('id')
                .eq('id', product_id)
                .eq('user_id', req.user.id)
                .single();

            if (productError || !product) {
                return res.status(404).json({ error: 'Produto não encontrado.' });
            }

            if (!bump_product_id) {
                return res.status(400).json({ error: 'Produto do bump é obrigatório.' });
            }

            // Verifica que o produto do bump existe e pertence ao mesmo vendedor
            const { data: bumpProduct, error: bumpProductError } = await supabase
                .from('products')
                .select('id, price')
                .eq('id', bump_product_id)
                .eq('user_id', req.user.id)
                .single();

            if (bumpProductError || !bumpProduct) {
                return res.status(404).json({ error: 'Produto do bump não encontrado ou não pertence a você.' });
            }

            // Se informou plan_id, valida que pertence ao produto do bump
            if (bump_plan_id) {
                const { data: plan, error: planError } = await supabase
                    .from('product_plans')
                    .select('id')
                    .eq('id', bump_plan_id)
                    .eq('product_id', bump_product_id)
                    .single();

                if (planError || !plan) {
                    return res.status(400).json({ error: 'Plano não encontrado para este produto.' });
                }
            }

            const { data, error } = await supabase
                .from('order_bumps')
                .insert({
                    product_id,
                    user_id: req.user.id,
                    bump_product_id,
                    bump_plan_id: bump_plan_id || null,
                    title: title || 'Oferta Especial',
                    description: description || null,
                    call_to_action: call_to_action || 'Sim! Quero adicionar esta oferta',
                    custom_price: custom_price ? Math.round(custom_price * 100) : null,
                    badge_text: badge_text || 'OFERTA EXCLUSIVA',
                    badge_color: badge_color || '#E17055',
                    sort_order: sort_order || 0,
                    is_active: true
                })
                .select(`
                    *,
                    bump_product:bump_product_id (
                        id, name, price, image_url,
                        plans:product_plans (id, name, price, sort_order)
                    ),
                    bump_plan:bump_plan_id (id, name, price)
                `)
                .single();

            if (error) throw error;

            res.status(201).json({ order_bump: data, message: 'Order bump criado com sucesso!' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Atualiza um order bump
     */
    async update(req, res, next) {
        try {
            const { product_id, bump_id } = req.params;
            const {
                bump_product_id,
                bump_plan_id,
                title,
                description,
                call_to_action,
                custom_price,
                badge_text,
                badge_color,
                sort_order,
                is_active
            } = req.body;

            // Verifica que o bump pertence ao produto e ao usuário
            const { data: existing, error: existingError } = await supabase
                .from('order_bumps')
                .select('id')
                .eq('id', bump_id)
                .eq('product_id', product_id)
                .eq('user_id', req.user.id)
                .single();

            if (existingError || !existing) {
                return res.status(404).json({ error: 'Order bump não encontrado.' });
            }

            const updates = {
                updated_at: new Date().toISOString()
            };

            if (bump_product_id !== undefined) updates.bump_product_id = bump_product_id;
            if (bump_plan_id !== undefined) updates.bump_plan_id = bump_plan_id || null;
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (call_to_action !== undefined) updates.call_to_action = call_to_action;
            if (custom_price !== undefined) updates.custom_price = custom_price ? Math.round(custom_price * 100) : null;
            if (badge_text !== undefined) updates.badge_text = badge_text;
            if (badge_color !== undefined) updates.badge_color = badge_color;
            if (sort_order !== undefined) updates.sort_order = sort_order;
            if (is_active !== undefined) updates.is_active = is_active;

            const { data, error } = await supabase
                .from('order_bumps')
                .update(updates)
                .eq('id', bump_id)
                .select(`
                    *,
                    bump_product:bump_product_id (
                        id, name, price, image_url,
                        plans:product_plans (id, name, price, sort_order)
                    ),
                    bump_plan:bump_plan_id (id, name, price)
                `)
                .single();

            if (error) throw error;

            res.json({ order_bump: data, message: 'Order bump atualizado com sucesso!' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Remove um order bump
     */
    async delete(req, res, next) {
        try {
            const { product_id, bump_id } = req.params;

            const { error } = await supabase
                .from('order_bumps')
                .delete()
                .eq('id', bump_id)
                .eq('product_id', product_id)
                .eq('user_id', req.user.id);

            if (error) throw error;

            res.json({ message: 'Order bump removido com sucesso!' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new OrderBumpController();
