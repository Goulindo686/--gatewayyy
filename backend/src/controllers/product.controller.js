const { supabase } = require('../config/database');

class ProductController {
    async create(req, res) {
        try {
            const { name, description, price, image_url, type, status, facebook_pixel_id, facebook_api_token, checkout_settings, store_category_id, show_in_store } = req.body;

            const { data, error } = await supabase
                .from('products')
                .insert({
                    user_id: req.user.id,
                    name,
                    description,
                    price: Math.round(price * 100),
                    image_url,
                    type: type || 'digital',
                    status: status || 'active',
                    store_category_id: store_category_id || null,
                    show_in_store: show_in_store || false,
                    facebook_pixel_id,
                    facebook_api_token,
                    checkout_settings: checkout_settings || {}
                })
                .select()
                .single();

            if (error) throw error;

            // Nunca retorna o token do Facebook na resposta
            const { facebook_api_token: _hidden, ...safeProduct } = data;
            res.status(201).json({ product: safeProduct, message: 'Produto criado com sucesso!' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async list(req, res, next) {
        try {
            const { page = 1, limit = 20, status, store_category_id } = req.query;
            const offset = (page - 1) * limit;

            let query = supabase
                .from('products')
                .select('*', { count: 'exact' })
                .eq('user_id', req.user.id)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (status) {
                query = query.eq('status', status);
            }

            if (store_category_id) {
                query = query.eq('store_category_id', store_category_id);
            }

            const { data, count, error } = await query;
            if (error) throw error;

            // Busca os planos de todos os produtos de uma vez
            const productIds = (data || []).map(p => p.id);
            let plansMap = {};
            if (productIds.length > 0) {
                const { data: allPlans } = await supabase
                    .from('product_plans')
                    .select('id, name, price, sort_order, product_id')
                    .in('product_id', productIds)
                    .order('sort_order', { ascending: true });

                for (const plan of (allPlans || [])) {
                    if (!plansMap[plan.product_id]) plansMap[plan.product_id] = [];
                    plansMap[plan.product_id].push({
                        ...plan,
                        price_display: (plan.price / 100).toFixed(2)
                    });
                }
            }

            res.json({
                products: data?.map(p => ({
                    ...p,
                    price_display: (p.price / 100).toFixed(2),
                    plans: plansMap[p.id] || []
                })),
                total: count,
                page: parseInt(page),
                totalPages: Math.ceil((count || 0) / limit)
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', req.params.id)
                .eq('user_id', req.user.id);

            const data = products && products.length > 0 ? products[0] : null;

            if (error || !data) {
                return res.status(404).json({ error: 'Produto não encontrado.' });
            }

            // Busca os planos do produto
            const { data: plans } = await supabase
                .from('product_plans')
                .select('id, name, price, sort_order')
                .eq('product_id', data.id)
                .order('sort_order', { ascending: true });

            const plansWithDisplay = (plans || []).map(p => ({
                ...p,
                price_display: (p.price / 100).toFixed(2)
            }));

            res.json({
                product: {
                    ...data,
                    price_display: (data.price / 100).toFixed(2),
                    plans: plansWithDisplay
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, description, price, image_url, type, status, facebook_pixel_id, facebook_api_token, checkout_settings, store_category_id, show_in_store } = req.body;

            const updates = {
                name,
                description,
                image_url,
                type,
                status,
                facebook_pixel_id,
                facebook_api_token,
                checkout_settings,
                store_category_id,
                show_in_store,
                updated_at: new Date().toISOString()
            };

            if (price !== undefined) {
                updates.price = Math.round(price * 100);
            }

            const { data, error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', id)
                .eq('user_id', req.user.id)
                .select()
                .single();
            
            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Produto não encontrado.' });

            // Nunca retorna o token do Facebook na resposta
            const { facebook_api_token: _hidden, ...safeProduct } = data;
            res.json({ product: safeProduct, message: 'Produto atualizado com sucesso!' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async delete(req, res, next) {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', req.params.id)
                .eq('user_id', req.user.id);

            if (error) throw error;

            res.json({ message: 'Produto excluído com sucesso!' });
        } catch (error) {
            next(error);
        }
    }

    // Public endpoint - for checkout
    async getPublic(req, res, next) {
        try {
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, description, price, image_url, type, user_id, checkout_settings, facebook_pixel_id')
                .eq('id', req.params.id)
                .eq('status', 'active');

            const data = products && products.length > 0 ? products[0] : null;

            if (error || !data) {
                return res.status(404).json({ error: 'Produto não encontrado.' });
            }

            // Get seller name
            const { data: sellers } = await supabase
                .from('users')
                .select('name')
                .eq('id', data.user_id);

            const seller = sellers && sellers.length > 0 ? sellers[0] : null;

            // Get product plans
            const { data: plans } = await supabase
                .from('product_plans')
                .select('id, name, price, sort_order')
                .eq('product_id', data.id)
                .order('sort_order', { ascending: true });

            // Get active order bumps
            const { data: orderBumps } = await supabase
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
                .eq('product_id', data.id)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            // Calcula preço efetivo de cada bump
            const bumpsWithPrice = (orderBumps || []).map(bump => {
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

            const plansWithDisplay = (plans || []).map(p => ({
                ...p,
                price_display: (p.price / 100).toFixed(2)
            }));

            res.json({
                product: {
                    ...data,
                    price_display: (data.price / 100).toFixed(2),
                    seller_name: seller?.name,
                    plans: plansWithDisplay,
                    order_bumps: bumpsWithPrice
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Manual Delivery (Grant access to student)
    async enrollUser(req, res, next) {
        try {
            const { id: productId } = req.params;
            const { email } = req.body;
            const sellerId = req.user.id;

            console.log(`[MANUAL-ENROLL-DEBUG] START: Product=${productId}, Email=${email}, Seller=${sellerId}`);

            // 1. Verify product ownership
            const { data: product, error: productErr } = await supabase
                .from('products')
                .select('id, name')
                .eq('id', productId)
                .eq('user_id', sellerId)
                .single();

            if (productErr) {
                console.error(`[MANUAL-ENROLL-DEBUG] Product check error:`, productErr.message);
                return res.status(403).json({ error: 'Erro ao verificar produto ou permissão.' });
            }
            if (!product) {
                console.error(`[MANUAL-ENROLL-DEBUG] Product NOT FOUND or not owned by seller`);
                return res.status(403).json({ error: 'Você não tem permissão para gerenciar este produto.' });
            }

            // 2. Find user (Case-insensitive direct query)
            const normalizedEmail = email.toLowerCase().trim();
            console.log(`[MANUAL-ENROLL-DEBUG] Searching for student: ${normalizedEmail}`);

            const { data: existingUsers, error: searchErr } = await supabase
                .from('users')
                .select('id, email')
                .ilike('email', normalizedEmail);

            if (searchErr) {
                console.error(`[MANUAL-ENROLL-DEBUG] User search error:`, searchErr.message);
                throw searchErr;
            }

            let user = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

            if (!user) {
                console.log(`[MANUAL-ENROLL-DEBUG] Creating shadow user for: ${normalizedEmail}`);
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert({
                        name: 'Estudante (Manual)',
                        email: normalizedEmail,
                        password_hash: 'MANUAL_ENROLLMENT_PENDING_SET',
                        role: 'customer',
                        status: 'active'
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error(`[MANUAL-ENROLL-DEBUG] User creation error:`, createError.message);
                    throw createError;
                }
                user = newUser;
                console.log(`[MANUAL-ENROLL-DEBUG] User created: ${user.id}`);
            } else {
                console.log(`[MANUAL-ENROLL-DEBUG] Existing user found: ${user.id}`);
            }

            // 3. Create or Update enrollment (Using onConflict for user_id/product_id uniqueness)
            console.log(`[MANUAL-ENROLL-DEBUG] Upserting enrollment: User=${user.id}, Product=${productId}`);
            const { error: enrollError } = await supabase
                .from('enrollments')
                .upsert({
                    user_id: user.id,
                    product_id: productId,
                    status: 'active'
                }, {
                    onConflict: 'user_id, product_id'
                });

            if (enrollError) {
                console.error(`[MANUAL-ENROLL-DEBUG] Enrollment upsert error:`, enrollError.message);
                throw enrollError;
            }

            console.log(`[MANUAL-ENROLL-DEBUG] SUCCESS: Access granted.`);

            res.json({
                message: `Acesso ao produto "${product.name}" concedido com sucesso para ${normalizedEmail}!`,
                user_id: user.id
            });
        } catch (error) {
            console.error(`[MANUAL-ENROLL-DEBUG] CRITICAL ERROR:`, error.message);
            next(error);
        }
    }
}

module.exports = new ProductController();
