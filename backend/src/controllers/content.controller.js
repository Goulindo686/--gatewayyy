const { supabase } = require('../config/database');

// Helper: verifica se o módulo pertence ao vendedor logado
async function assertModuleOwnership(moduleId, userId) {
    const { data } = await supabase
        .from('product_modules')
        .select('product_id, products(user_id)')
        .eq('id', moduleId)
        .single();
    if (!data || data.products?.user_id !== userId) return false;
    return true;
}

// Helper: verifica se a aula pertence ao vendedor logado
async function assertLessonOwnership(lessonId, userId) {
    const { data } = await supabase
        .from('product_lessons')
        .select('module_id, product_modules(product_id, products(user_id))')
        .eq('id', lessonId)
        .single();
    if (!data || data.product_modules?.products?.user_id !== userId) return false;
    return true;
}

class ContentController {
    // Modules
    async listModules(req, res, next) {
        try {
            const { productId } = req.params;

            // Verifica ownership antes de listar
            const { data: product } = await supabase
                .from('products')
                .select('id')
                .eq('id', productId)
                .eq('user_id', req.user.id)
                .single();

            if (!product) return res.status(403).json({ error: 'Acesso negado.' });

            const { data, error } = await supabase
                .from('product_modules')
                .select('*')
                .eq('product_id', productId)
                .order('order', { ascending: true });

            if (error) throw error;
            res.json({ modules: data });
        } catch (error) {
            next(error);
        }
    }

    async createModule(req, res, next) {
        try {
            const { productId } = req.params;
            const { title, order } = req.body;

            // Verifica ownership do produto
            const { data: product } = await supabase
                .from('products')
                .select('id')
                .eq('id', productId)
                .eq('user_id', req.user.id)
                .single();

            if (!product) return res.status(403).json({ error: 'Acesso negado.' });

            const { data, error } = await supabase
                .from('product_modules')
                .insert({ product_id: productId, title, order: order || 0 })
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ module: data, message: 'Módulo criado com sucesso!' });
        } catch (error) {
            next(error);
        }
    }

    async updateModule(req, res, next) {
        try {
            const { moduleId } = req.params;
            const { title, order } = req.body;

            // Verifica se o módulo pertence ao vendedor logado
            const isOwner = await assertModuleOwnership(moduleId, req.user.id);
            if (!isOwner) return res.status(403).json({ error: 'Acesso negado.' });

            const { data, error } = await supabase
                .from('product_modules')
                .update({ title, order, updated_at: new Date().toISOString() })
                .eq('id', moduleId)
                .select()
                .single();

            if (error) throw error;
            res.json({ module: data, message: 'Módulo atualizado!' });
        } catch (error) {
            next(error);
        }
    }

    async deleteModule(req, res, next) {
        try {
            const { moduleId } = req.params;

            // Verifica se o módulo pertence ao vendedor logado
            const isOwner = await assertModuleOwnership(moduleId, req.user.id);
            if (!isOwner) return res.status(403).json({ error: 'Acesso negado.' });

            const { error } = await supabase
                .from('product_modules')
                .delete()
                .eq('id', moduleId);

            if (error) throw error;
            res.json({ message: 'Módulo excluído!' });
        } catch (error) {
            next(error);
        }
    }

    // Lessons
    async listLessons(req, res, next) {
        try {
            const { moduleId } = req.params;

            // Verifica ownership do módulo
            const isOwner = await assertModuleOwnership(moduleId, req.user.id);
            if (!isOwner) return res.status(403).json({ error: 'Acesso negado.' });

            const { data, error } = await supabase
                .from('product_lessons')
                .select('*')
                .eq('module_id', moduleId)
                .order('order', { ascending: true });

            if (error) throw error;
            res.json({ lessons: data });
        } catch (error) {
            next(error);
        }
    }

    async createLesson(req, res, next) {
        try {
            const { moduleId } = req.params;
            const { title, description, video_url, video_source, order, content } = req.body;

            // Verifica ownership do módulo
            const isOwner = await assertModuleOwnership(moduleId, req.user.id);
            if (!isOwner) return res.status(403).json({ error: 'Acesso negado.' });

            const { data, error } = await supabase
                .from('product_lessons')
                .insert({
                    module_id: moduleId,
                    title,
                    description,
                    video_url,
                    video_source: video_source || 'youtube',
                    order: order || 0,
                    content
                })
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ lesson: data, message: 'Aula criada com sucesso!' });
        } catch (error) {
            next(error);
        }
    }

    async updateLesson(req, res, next) {
        try {
            const { lessonId } = req.params;

            // Verifica se a aula pertence ao vendedor logado
            const isOwner = await assertLessonOwnership(lessonId, req.user.id);
            if (!isOwner) return res.status(403).json({ error: 'Acesso negado.' });

            const updates = { ...req.body, updated_at: new Date().toISOString() };

            const { data, error } = await supabase
                .from('product_lessons')
                .update(updates)
                .eq('id', lessonId)
                .select()
                .single();

            if (error) throw error;
            res.json({ lesson: data, message: 'Aula atualizada!' });
        } catch (error) {
            next(error);
        }
    }

    async deleteLesson(req, res, next) {
        try {
            const { lessonId } = req.params;

            // Verifica se a aula pertence ao vendedor logado
            const isOwner = await assertLessonOwnership(lessonId, req.user.id);
            if (!isOwner) return res.status(403).json({ error: 'Acesso negado.' });

            const { error } = await supabase
                .from('product_lessons')
                .delete()
                .eq('id', lessonId);

            if (error) throw error;
            res.json({ message: 'Aula excluída!' });
        } catch (error) {
            next(error);
        }
    }

    // Files
    async listFiles(req, res, next) {
        try {
            const { lessonId } = req.params;
            const isOwner = await assertLessonOwnership(lessonId, req.user.id);
            if (!isOwner) return res.status(403).json({ error: 'Acesso negado.' });

            const { data, error } = await supabase
                .from('product_files')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            res.json({ files: data });
        } catch (error) {
            next(error);
        }
    }

    async addFile(req, res, next) {
        try {
            const { lessonId } = req.params;
            const { title, file_url, file_type } = req.body;

            const isOwner = await assertLessonOwnership(lessonId, req.user.id);
            if (!isOwner) return res.status(403).json({ error: 'Acesso negado.' });

            const { data, error } = await supabase
                .from('product_files')
                .insert({ lesson_id: lessonId, title, file_url, file_type: file_type || 'file' })
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ file: data, message: 'Arquivo adicionado!' });
        } catch (error) {
            next(error);
        }
    }

    async deleteFile(req, res, next) {
        try {
            const { fileId } = req.params;

            // Verifica ownership via join
            const { data: file } = await supabase
                .from('product_files')
                .select('lesson_id')
                .eq('id', fileId)
                .single();

            if (!file) return res.status(404).json({ error: 'Arquivo não encontrado.' });

            const isOwner = await assertLessonOwnership(file.lesson_id, req.user.id);
            if (!isOwner) return res.status(403).json({ error: 'Acesso negado.' });

            const { error } = await supabase
                .from('product_files')
                .delete()
                .eq('id', fileId);

            if (error) throw error;
            res.json({ message: 'Arquivo removido!' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ContentController();
