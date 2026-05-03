const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Salvar configuração de página gerada
exports.savePage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, slug, template, theme, components, isPublished } = req.body;

    // Validações
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Nome e slug são obrigatórios'
      });
    }

    // Verificar se o slug já existe para este usuário
    const { data: existingPage } = await supabase
      .from('generated_pages')
      .select('id')
      .eq('user_id', userId)
      .eq('slug', slug)
      .single();

    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma página com este slug'
      });
    }

    // Criar página
    const { data: page, error } = await supabase
      .from('generated_pages')
      .insert({
        user_id: userId,
        name,
        slug,
        template,
        theme: JSON.stringify(theme),
        components: JSON.stringify(components),
        is_published: isPublished || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Página salva com sucesso',
      data: page
    });
  } catch (error) {
    console.error('Erro ao salvar página:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar página',
      error: error.message
    });
  }
};

// Atualizar página existente
exports.updatePage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { name, slug, template, theme, components, isPublished } = req.body;

    // Verificar se a página pertence ao usuário
    const { data: existingPage } = await supabase
      .from('generated_pages')
      .select('*')
      .eq('id', pageId)
      .eq('user_id', userId)
      .single();

    if (!existingPage) {
      return res.status(404).json({
        success: false,
        message: 'Página não encontrada'
      });
    }

    // Atualizar página
    const { data: page, error } = await supabase
      .from('generated_pages')
      .update({
        name: name || existingPage.name,
        slug: slug || existingPage.slug,
        template: template || existingPage.template,
        theme: theme ? JSON.stringify(theme) : existingPage.theme,
        components: components ? JSON.stringify(components) : existingPage.components,
        is_published: isPublished !== undefined ? isPublished : existingPage.is_published,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Página atualizada com sucesso',
      data: page
    });
  } catch (error) {
    console.error('Erro ao atualizar página:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar página',
      error: error.message
    });
  }
};

// Listar páginas do usuário
exports.listPages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const { data: pages, error, count } = await supabase
      .from('generated_pages')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: {
        pages: pages.map(page => ({
          ...page,
          theme: JSON.parse(page.theme),
          components: JSON.parse(page.components)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao listar páginas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar páginas',
      error: error.message
    });
  }
};

// Obter página específica
exports.getPage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    const { data: page, error } = await supabase
      .from('generated_pages')
      .select('*')
      .eq('id', pageId)
      .eq('user_id', userId)
      .single();

    if (error || !page) {
      return res.status(404).json({
        success: false,
        message: 'Página não encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        ...page,
        theme: JSON.parse(page.theme),
        components: JSON.parse(page.components)
      }
    });
  } catch (error) {
    console.error('Erro ao obter página:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter página',
      error: error.message
    });
  }
};

// Obter página pública por slug (sem autenticação)
exports.getPublicPage = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: page, error } = await supabase
      .from('generated_pages')
      .select(`
        *,
        users:user_id (
          name,
          email
        )
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !page) {
      return res.status(404).json({
        success: false,
        message: 'Página não encontrada ou não publicada'
      });
    }

    // Incrementar visualizações
    await supabase
      .from('generated_pages')
      .update({ views: (page.views || 0) + 1 })
      .eq('id', page.id);

    res.json({
      success: true,
      data: {
        ...page,
        theme: JSON.parse(page.theme),
        components: JSON.parse(page.components)
      }
    });
  } catch (error) {
    console.error('Erro ao obter página pública:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter página',
      error: error.message
    });
  }
};

// Deletar página
exports.deletePage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    // Verificar se a página pertence ao usuário
    const { data: existingPage } = await supabase
      .from('generated_pages')
      .select('id')
      .eq('id', pageId)
      .eq('user_id', userId)
      .single();

    if (!existingPage) {
      return res.status(404).json({
        success: false,
        message: 'Página não encontrada'
      });
    }

    const { error } = await supabase
      .from('generated_pages')
      .delete()
      .eq('id', pageId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Página deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar página:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar página',
      error: error.message
    });
  }
};

// Duplicar página
exports.duplicatePage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    // Buscar página original
    const { data: originalPage } = await supabase
      .from('generated_pages')
      .select('*')
      .eq('id', pageId)
      .eq('user_id', userId)
      .single();

    if (!originalPage) {
      return res.status(404).json({
        success: false,
        message: 'Página não encontrada'
      });
    }

    // Criar cópia
    const { data: newPage, error } = await supabase
      .from('generated_pages')
      .insert({
        user_id: userId,
        name: `${originalPage.name} (Cópia)`,
        slug: `${originalPage.slug}-copy-${Date.now()}`,
        template: originalPage.template,
        theme: originalPage.theme,
        components: originalPage.components,
        is_published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Página duplicada com sucesso',
      data: newPage
    });
  } catch (error) {
    console.error('Erro ao duplicar página:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao duplicar página',
      error: error.message
    });
  }
};

// Exportar página como HTML
exports.exportPage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    const { data: page } = await supabase
      .from('generated_pages')
      .select('*')
      .eq('id', pageId)
      .eq('user_id', userId)
      .single();

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Página não encontrada'
      });
    }

    const theme = JSON.parse(page.theme);
    const components = JSON.parse(page.components);

    // Gerar HTML
    const html = generateHTML(page.name, theme, components);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${page.slug}.html"`);
    res.send(html);
  } catch (error) {
    console.error('Erro ao exportar página:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao exportar página',
      error: error.message
    });
  }
};

// Função auxiliar para gerar HTML
function generateHTML(title, theme, components) {
  const componentHTML = components.map(comp => {
    switch (comp.type) {
      case 'header':
        return `
          <header style="background: ${theme.primaryColor}; padding: 1rem; color: white;">
            <nav style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
              <h1 style="font-size: 1.5rem; font-weight: bold;">${comp.config.logo}</h1>
              <ul style="display: flex; gap: 2rem; list-style: none;">
                ${comp.config.menuItems.map(item => `<li><a href="#" style="color: white; text-decoration: none;">${item}</a></li>`).join('')}
              </ul>
            </nav>
          </header>
        `;
      case 'hero':
        return `
          <section style="background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}); padding: 6rem 2rem; text-align: center; color: white;">
            <div style="max-width: 800px; margin: 0 auto;">
              <h1 style="font-size: 3rem; font-weight: bold; margin-bottom: 1rem;">${comp.config.title}</h1>
              <p style="font-size: 1.25rem; margin-bottom: 2rem;">${comp.config.subtitle}</p>
              <button style="background: white; color: ${theme.primaryColor}; padding: 1rem 2rem; border: none; border-radius: 0.5rem; font-size: 1.125rem; font-weight: bold; cursor: pointer;">
                ${comp.config.buttonText}
              </button>
            </div>
          </section>
        `;
      case 'features':
        return `
          <section style="padding: 4rem 2rem; background: white;">
            <div style="max-width: 1200px; margin: 0 auto;">
              <h2 style="font-size: 2.5rem; font-weight: bold; text-align: center; margin-bottom: 3rem;">${comp.config.title}</h2>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                ${comp.config.items.map(item => `
                  <div style="padding: 2rem; border: 1px solid #e5e7eb; border-radius: 1rem;">
                    <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;">${item.title}</h3>
                    <p style="color: #6b7280;">${item.description}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </section>
        `;
      case 'cta':
        return `
          <section style="background: ${comp.config.backgroundColor}; padding: 4rem 2rem; text-align: center; color: white;">
            <div style="max-width: 800px; margin: 0 auto;">
              <h2 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 2rem;">${comp.config.title}</h2>
              <button style="background: white; color: ${comp.config.backgroundColor}; padding: 1rem 2rem; border: none; border-radius: 0.5rem; font-size: 1.125rem; font-weight: bold; cursor: pointer;">
                ${comp.config.buttonText}
              </button>
            </div>
          </section>
        `;
      case 'footer':
        return `
          <footer style="background: #1f2937; color: white; padding: 2rem; text-align: center;">
            <div style="max-width: 1200px; margin: 0 auto;">
              <p>${comp.config.text}</p>
              <div style="margin-top: 1rem; display: flex; gap: 2rem; justify-content: center;">
                ${comp.config.links.map(link => `<a href="#" style="color: white; text-decoration: none;">${link}</a>`).join('')}
              </div>
            </div>
          </footer>
        `;
      default:
        return '';
    }
  }).join('\n');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: ${theme.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: ${theme.backgroundColor};
    }
  </style>
</head>
<body>
  ${componentHTML}
</body>
</html>
  `.trim();
}

// Obter estatísticas das páginas
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: pages } = await supabase
      .from('generated_pages')
      .select('is_published, views')
      .eq('user_id', userId);

    const stats = {
      total: pages.length,
      published: pages.filter(p => p.is_published).length,
      draft: pages.filter(p => !p.is_published).length,
      totalViews: pages.reduce((sum, p) => sum + (p.views || 0), 0)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message
    });
  }
};
