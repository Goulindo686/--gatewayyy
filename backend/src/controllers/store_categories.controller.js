const { supabase } = require('../config/database');

function cleanCategoryImageUrl(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) return null;
    return trimmed.slice(0, 1000);
}

class StoreCategoryController {
    async create(req, res, next) {
        try {
            const { name, slug, image_url } = req.body;

            const { data: categories, error } = await supabase
                .from('store_categories')
                .insert({
                    user_id: req.user.id,
                    name,
                    slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    image_url: cleanCategoryImageUrl(image_url)
                })
                .select();

            if (error) throw error;
            const data = categories && categories.length > 0 ? categories[0] : null;

            if (error) throw error;
            res.status(201).json({ category: data, message: 'Categoria criada com sucesso!' });
        } catch (error) {
            next(error);
        }
    }

    async list(req, res, next) {
        try {
            const { data, error } = await supabase
                .from('store_categories')
                .select('*')
                .eq('user_id', req.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ categories: data });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const { name, slug, image_url } = req.body;
            const updates = {};
            if (name !== undefined) updates.name = name;
            if (slug !== undefined) updates.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
            if (image_url !== undefined) updates.image_url = cleanCategoryImageUrl(image_url);

            const { data: categories, error } = await supabase
                .from('store_categories')
                .update(updates)
                .eq('id', req.params.id)
                .eq('user_id', req.user.id)
                .select();

            if (error) throw error;
            const data = categories && categories.length > 0 ? categories[0] : null;

            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Categoria não encontrada.' });

            res.json({ category: data, message: 'Categoria atualizada com sucesso!' });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const { error } = await supabase
                .from('store_categories')
                .delete()
                .eq('id', req.params.id)
                .eq('user_id', req.user.id);

            if (error) throw error;
            res.json({ message: 'Categoria excluída com sucesso!' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new StoreCategoryController();
