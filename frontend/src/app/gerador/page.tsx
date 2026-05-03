'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Layout, ShoppingBag, FileText, Palette, 
  Eye, Code, Download, Save, Wand2, Grid3x3, Type,
  Image as ImageIcon, Box, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

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

  const templates = [
    {
      id: 'sales-page',
      name: 'Página de Vendas',
      description: 'Página otimizada para conversão com seções de benefícios, depoimentos e CTA',
      icon: FileText,
      preview: '/templates/sales-page.png',
      components: ['header', 'hero', 'features', 'testimonials', 'cta', 'footer']
    },
    {
      id: 'store',
      name: 'Loja Completa',
      description: 'E-commerce com catálogo de produtos, carrinho e checkout integrado',
      icon: ShoppingBag,
      preview: '/templates/store.png',
      components: ['header', 'hero', 'products', 'cta', 'footer']
    },
    {
      id: 'landing',
      name: 'Landing Page',
      description: 'Página de captura com foco em conversão e formulário de contato',
      icon: Layout,
      preview: '/templates/landing.png',
      components: ['header', 'hero', 'features', 'cta']
    },
    {
      id: 'custom',
      name: 'Personalizado',
      description: 'Comece do zero e adicione os componentes que desejar',
      icon: Wand2,
      preview: '/templates/custom.png',
      components: []
    }
  ];

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
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const components = template.components.map((type, index) => ({
        id: `${type}-${index}`,
        type: type as ComponentType,
        config: getDefaultConfig(type as ComponentType)
      }));
      
      setPageConfig({
        ...pageConfig,
        template: templateId,
        components
      });
      setStep('editor');
    }
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
        columns: 3
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
        buttonText: 'Comece Agora',
        backgroundColor: '#6366f1'
      },
      footer: {
        text: '© 2024 Todos os direitos reservados',
        links: ['Termos', 'Privacidade', 'Contato']
      }
    };
    return defaults[type] || {};
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
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all">
                  <Download className="w-4 h-4" />
                  Exportar
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
                Escolha um Template
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Comece com um modelo profissional ou crie do zero
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {templates.map((template, index) => {
                const Icon = template.icon;
                return (
                  <motion.button
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => selectTemplate(template.id as TemplateType)}
                    className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-xl"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                          {template.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {template.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {template.components.slice(0, 4).map((comp) => (
                          <span
                            key={comp}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400 rounded"
                          >
                            {comp}
                          </span>
                        ))}
                        {template.components.length > 4 && (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400 rounded">
                            +{template.components.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
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
                        className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors text-left"
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
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Canvas - Área de Edição */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 min-h-[600px]">
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Editor Visual
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Arraste componentes da barra lateral para começar a construir sua página
                  </p>
                  {pageConfig.components.length === 0 && (
                    <div className="text-sm text-slate-500 dark:text-slate-500">
                      Nenhum componente adicionado ainda
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="text-center py-12">
              <Eye className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Preview da Página
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Visualize como sua página ficará para os visitantes
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
