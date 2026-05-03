'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Layout, ShoppingBag, FileText, Palette, 
  Eye, Code, Download, Save, Wand2, Grid3x3, Type,
  Image as ImageIcon, Box, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import ComponentEditor from '@/components/generator/ComponentEditor';
import PagePreview from '@/components/generator/PagePreview';

type TemplateType = 'sales-page' | 'store' | 'landing' | 'custom';
type ComponentType = 'header' | 'hero' | 'features' | 'products' | 'testimonials' | 'cta' | 'footer';

interface PageComponent {
  id: string;
  type: ComponentType;
  config: Record<string, any>;
}

interface PageConfig {
  template: TemplateType;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    backgroundColor: string;
  };
  components: PageComponent[];
}

export default function GeradorInteligente() {
  const [step, setStep] = useState<'template' | 'editor' | 'preview'>('template');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pageName, setPageName] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pageConfig, setPageConfig] = useState<PageConfig>({
    template: 'custom',
    theme: {
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      fontFamily: 'Inter',
      backgroundColor: '#ffffff'
    },
    components: []
  });

  const availableComponents = [
    { type: 'header', name: 'Cabeçalho', icon: Layout, description: 'Menu de navegação' },
    { type: 'hero', name: 'Hero Section', icon: Sparkles, description: 'Seção principal de destaque' },
    { type: 'features', name: 'Recursos', icon: Grid3x3, description: 'Grade de benefícios' },
    { type: 'products', name: 'Produtos', icon: ShoppingBag, description: 'Catálogo de produtos' },
    { type: 'testimonials', name: 'Depoimentos', icon: Type, description: 'Avaliações de clientes' },
    { type: 'cta', name: 'Call to Action', icon: Box, description: 'Botão de ação' },
    { type: 'footer', name: 'Rodapé', icon: Layout, description: 'Informações de contato' }
  ];

  const selectTemplate = (templateId: TemplateType) => {
    // Sempre começa vazio para personalização total
    setPageConfig({
      ...pageConfig,
      template: templateId,
      components: []
    });
    setStep('editor');
  };

  const getDefaultConfig = (type: ComponentType): Record<string, any> => {
    const defaults: Record<ComponentType, Record<string, any>> = {
      header: {
        logo: 'Minha Marca',
        menuItems: ['Início', 'Produtos', 'Sobre', 'Contato']
      },
      hero: {
        title: 'Transforme Seu Negócio',
        subtitle: 'A solução completa para suas vendas online',
        buttonText: 'Começar Agora',
        backgroundImage: ''
      },
      features: {
        title: 'Por Que Escolher?',
        items: [
          { icon: 'check', title: 'Fácil de Usar', description: 'Interface intuitiva' },
          { icon: 'check', title: 'Seguro', description: 'Pagamentos protegidos' },
          { icon: 'check', title: 'Suporte 24/7', description: 'Sempre disponível' }
        ]
      },
      products: {
        title: 'Nossos Produtos',
        showPrice: true,
        columns: 3,
        items: [
          {
            name: 'Produto 1',
            description: 'Descrição do produto',
            price: 99.90,
            image: ''
          },
          {
            name: 'Produto 2',
            description: 'Descrição do produto',
            price: 149.90,
            image: ''
          },
          {
            name: 'Produto 3',
            description: 'Descrição do produto',
            price: 199.90,
            image: ''
          }
        ]
      },
      testimonials: {
        title: 'O Que Dizem Nossos Clientes',
        items: [
          { name: 'João Silva', text: 'Excelente serviço!', rating: 5 },
          { name: 'Maria Santos', text: 'Recomendo muito!', rating: 5 }
        ]
      },
      cta: {
        title: 'Pronto Para Começar?',
        buttonText: 'Comece Agora'
      },
      footer: {
        text: '© 2024 Todos os direitos reservados',
        links: ['Termos', 'Privacidade', 'Contato']
      }
    };
    return defaults[type] || {};
  };

  const addComponent = (type: ComponentType) => {
    const newComponent = {
      id: `${type}-${Date.now()}`,
      type,
      config: getDefaultConfig(type)
    };
    setPageConfig({
      ...pageConfig,
      components: [...pageConfig.components, newComponent]
    });
  };

  const updateComponent = (id: string, newConfig: any) => {
    setPageConfig({
      ...pageConfig,
      components: pageConfig.components.map(comp =>
        comp.id === id ? { ...comp, config: newConfig } : comp
      )
    });
  };

  const deleteComponent = (id: string) => {
    setPageConfig({
      ...pageConfig,
      components: pageConfig.components.filter(comp => comp.id !== id)
    });
  };

  const duplicateComponent = (id: string) => {
    const component = pageConfig.components.find(comp => comp.id === id);
    if (component) {
      const newComponent = {
        ...component,
        id: `${component.type}-${Date.now()}`
      };
      const index = pageConfig.components.findIndex(comp => comp.id === id);
      const newComponents = [...pageConfig.components];
      newComponents.splice(index + 1, 0, newComponent);
      setPageConfig({
        ...pageConfig,
        components: newComponents
      });
    }
  };

  const moveComponent = (id: string, direction: 'up' | 'down') => {
    const index = pageConfig.components.findIndex(comp => comp.id === id);
    if (index === -1) return;
    
    const newComponents = [...pageConfig.components];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newComponents.length) return;
    
    [newComponents[index], newComponents[newIndex]] = [newComponents[newIndex], newComponents[index]];
    
    setPageConfig({
      ...pageConfig,
      components: newComponents
    });
  };

  const handleSave = async () => {
    if (!pageName || !pageSlug) {
      setShowSaveModal(true);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/generator/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: pageName,
          slug: pageSlug,
          template: pageConfig.template,
          theme: pageConfig.theme,
          components: pageConfig.components,
          isPublished: false
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('✅ Página salva com sucesso!');
      } else {
        alert('❌ Erro ao salvar: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar página. Verifique se o backend está rodando.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      const html = generateHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pageSlug || 'minha-pagina'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('✅ Página exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('❌ Erro ao exportar página');
    } finally {
      setExporting(false);
    }
  };

  const generateHTML = () => {
    const { theme, components } = pageConfig;
    
    const componentHTML = components.map(comp => {
      switch (comp.type) {
        case 'header':
          return `
            <header style="background: ${theme.primaryColor}; padding: 1rem; color: white;">
              <nav style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
                <h1 style="font-size: 1.5rem; font-weight: bold;">${comp.config.logo}</h1>
                <ul style="display: flex; gap: 2rem; list-style: none;">
                  ${comp.config.menuItems.map((item: string) => `<li><a href="#" style="color: white; text-decoration: none;">${item}</a></li>`).join('')}
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
            <section style="padding: 4rem 2rem; background: ${theme.backgroundColor};">
              <div style="max-width: 1200px; margin: 0 auto;">
                <h2 style="font-size: 2.5rem; font-weight: bold; text-align: center; margin-bottom: 3rem; color: #1f2937;">${comp.config.title}</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                  ${comp.config.items.map((item: any) => `
                    <div style="padding: 2rem; border: 1px solid #e5e7eb; border-radius: 1rem;">
                      <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: ${theme.primaryColor};">${item.title}</h3>
                      <p style="color: #6b7280;">${item.description}</p>
                    </div>
                  `).join('')}
                </div>
              </div>
            </section>
          `;
        case 'products':
          return `
            <section style="padding: 4rem 2rem; background: #f9fafb;">
              <div style="max-width: 1200px; margin: 0 auto;">
                <h2 style="font-size: 2.5rem; font-weight: bold; text-align: center; margin-bottom: 3rem; color: #1f2937;">${comp.config.title}</h2>
                <div style="display: grid; grid-template-columns: repeat(${comp.config.columns}, 1fr); gap: 2rem;">
                  ${comp.config.items.map((item: any) => `
                    <div style="background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      <div style="height: 200px; background: ${item.image ? `url(${item.image})` : 'linear-gradient(135deg, #e5e7eb, #d1d5db)'}; background-size: cover; background-position: center;"></div>
                      <div style="padding: 1.5rem;">
                        <h3 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; color: #1f2937;">${item.name}</h3>
                        <p style="color: #6b7280; margin-bottom: 1rem;">${item.description}</p>
                        ${comp.config.showPrice ? `<p style="font-size: 1.5rem; font-weight: bold; color: ${theme.primaryColor}; margin-bottom: 1rem;">R$ ${item.price.toFixed(2)}</p>` : ''}
                        <button style="width: 100%; padding: 0.75rem; background: ${theme.primaryColor}; color: white; border: none; border-radius: 0.5rem; font-weight: bold; cursor: pointer;">Comprar</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </section>
          `;
        case 'cta':
          return `
            <section style="background: ${theme.primaryColor}; padding: 4rem 2rem; text-align: center; color: white;">
              <div style="max-width: 800px; margin: 0 auto;">
                <h2 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 2rem;">${comp.config.title}</h2>
                <button style="background: white; color: ${theme.primaryColor}; padding: 1rem 2rem; border: none; border-radius: 0.5rem; font-size: 1.125rem; font-weight: bold; cursor: pointer;">
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
                  ${comp.config.links.map((link: string) => `<a href="#" style="color: white; text-decoration: none;">${link}</a>`).join('')}
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
  <title>${pageName || 'Minha Página'}</title>
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar</span>
              </Link>
              <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <Wand2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Gerador Inteligente
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Crie sites e lojas profissionais em minutos
                  </p>
                </div>
              </div>
            </div>
            
            {step !== 'template' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep('editor')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    step === 'editor'
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  Editor
                </button>
                <button
                  onClick={() => setStep('preview')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    step === 'preview'
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
                <button 
                  onClick={() => setShowSaveModal(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button 
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exportando...' : 'Exportar'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'template' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Criar Nova Página
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Comece do zero e adicione os componentes que desejar
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => selectTemplate('custom')}
                className="group relative bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-xl w-full"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                    <Wand2 className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      Começar a Criar
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Crie sua página personalizada adicionando componentes como cabeçalho, hero, produtos, depoimentos e muito mais
                    </p>
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Componentes */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Componentes
                </h3>
                <div className="space-y-2">
                  {availableComponents.map((component) => {
                    const Icon = component.icon;
                    return (
                      <button
                        key={component.type}
                        onClick={() => addComponent(component.type as ComponentType)}
                        className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900 hover:border-indigo-500 border-2 border-transparent transition-all text-left"
                      >
                        <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {component.name}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {component.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tema */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Personalização
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Cor Principal
                    </label>
                    <input
                      type="color"
                      value={pageConfig.theme.primaryColor}
                      onChange={(e) => setPageConfig({
                        ...pageConfig,
                        theme: { ...pageConfig.theme, primaryColor: e.target.value }
                      })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={pageConfig.theme.primaryColor}
                      onChange={(e) => setPageConfig({
                        ...pageConfig,
                        theme: { ...pageConfig.theme, primaryColor: e.target.value }
                      })}
                      className="w-full mt-1 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Cor Secundária
                    </label>
                    <input
                      type="color"
                      value={pageConfig.theme.secondaryColor}
                      onChange={(e) => setPageConfig({
                        ...pageConfig,
                        theme: { ...pageConfig.theme, secondaryColor: e.target.value }
                      })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={pageConfig.theme.secondaryColor}
                      onChange={(e) => setPageConfig({
                        ...pageConfig,
                        theme: { ...pageConfig.theme, secondaryColor: e.target.value }
                      })}
                      className="w-full mt-1 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Cor de Fundo
                    </label>
                    <input
                      type="color"
                      value={pageConfig.theme.backgroundColor}
                      onChange={(e) => setPageConfig({
                        ...pageConfig,
                        theme: { ...pageConfig.theme, backgroundColor: e.target.value }
                      })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={pageConfig.theme.backgroundColor}
                      onChange={(e) => setPageConfig({
                        ...pageConfig,
                        theme: { ...pageConfig.theme, backgroundColor: e.target.value }
                      })}
                      className="w-full mt-1 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Fonte
                    </label>
                    <select
                      value={pageConfig.theme.fontFamily}
                      onChange={(e) => setPageConfig({
                        ...pageConfig,
                        theme: { ...pageConfig.theme, fontFamily: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Lato">Lato</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Canvas - Área de Edição */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 min-h-[600px]">
                {pageConfig.components.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      Editor Visual
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      Clique nos componentes da barra lateral para adicionar à sua página
                    </p>
                    <div className="text-sm text-slate-500 dark:text-slate-500">
                      Nenhum componente adicionado ainda
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Componentes da Página ({pageConfig.components.length})
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Clique para expandir e editar cada componente
                      </p>
                    </div>
                    {pageConfig.components.map((component, index) => (
                      <ComponentEditor
                        key={component.id}
                        component={component}
                        onUpdate={(config) => updateComponent(component.id, config)}
                        onDelete={() => deleteComponent(component.id)}
                        onDuplicate={() => duplicateComponent(component.id)}
                        onMoveUp={() => moveComponent(component.id, 'up')}
                        onMoveDown={() => moveComponent(component.id, 'down')}
                        canMoveUp={index > 0}
                        canMoveDown={index < pageConfig.components.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Preview da Página
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Visualize como sua página ficará para os visitantes
              </p>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              <PagePreview theme={pageConfig.theme} components={pageConfig.components} />
            </div>
          </div>
        )}
      </main>

      {/* Modal de Salvar */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Salvar Página
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome da Página
                </label>
                <input
                  type="text"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  placeholder="Ex: Minha Loja Incrível"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  URL (Slug)
                </label>
                <input
                  type="text"
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="Ex: minha-loja-incrivel"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sua página ficará em: /p/{pageSlug || 'seu-slug'}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  handleSave();
                }}
                disabled={!pageName || !pageSlug}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
