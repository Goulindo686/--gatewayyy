const { supabase } = require('../config/database');

class StoreController {
    async getStoreBySlug(req, res, next) {
        try {
            const { slug } = req.params;

            // Find user by store_slug where store_active is true
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, store_name, store_description, store_theme, store_banner_url')
                .eq('store_slug', slug)
                .eq('store_active', true);

            const user = users && users.length > 0 ? users[0] : null;

            if (userError || !user) {
                return res.status(404).json({ error: 'Loja não encontrada ou inativa.' });
            }

            // Fetch categories for this user
            const { data: categories } = await supabase
                .from('store_categories')
                .select('id, name, slug, image_url')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // Fetch products for this user that are active and set to show in store
            let query = supabase
                .from('products')
                .select('id, name, description, price, image_url, type, store_category_id')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .eq('show_in_store', true)
                .order('created_at', { ascending: false });

            // If a category slug is provided in the query, filter products
            if (req.query.category) {
                const category = categories?.find(c => c.slug === req.query.category);
                if (category) {
                    query = query.eq('store_category_id', category.id);
                }
            }

            const { data: products, error: productsError } = await query;

            if (productsError) {
                throw productsError;
            }

            // Format product prices
            const formattedProducts = products?.map(p => ({
                ...p,
                price: p.price / 100, // Important: Cart expects real value
                price_display: (p.price / 100).toFixed(2)
            })) || [];

            res.json({
                store: {
                    name: user.store_name,
                    description: user.store_description,
                    theme: user.store_theme || 'light',
                    banner_url: user.store_banner_url
                },
                categories: categories || [],
                products: formattedProducts
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new StoreController();
