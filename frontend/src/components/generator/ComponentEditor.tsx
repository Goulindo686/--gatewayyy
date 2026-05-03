'use client';

import { useState } from 'react';
import { X, ChevronUp, ChevronDown, Trash2, Copy, Settings } from 'lucide-react';

interface ComponentEditorProps {
  component: any;
  onUpdate: (config: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export default function ComponentEditor({
  component,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}: ComponentEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderEditor = () => {
    switch (component.type) {
      case 'header':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Logo/Nome
              </label>
              <input
                type="text"
                value={component.config.logo}
                onChange={(e) => onUpdate({ ...component.config, logo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Itens do Menu (separados por vírgula)
              </label>
              <input
                type="text"
                value={component.config.menuItems.join(', ')}
                onChange={(e) => onUpdate({ 
                  ...component.config, 
                  menuItems: e.target.value.split(',').map(item => item.trim()) 
                })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>
        );

      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Título Principal
              </label>
              <input
                type="text"
                value={component.config.title}
                onChange={(e) => onUpdate({ ...component.config, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Subtítulo
              </label>
              <textarea
                value={component.config.subtitle}
                onChange={(e) => onUpdate({ ...component.config, subtitle: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Texto do Botão
              </label>
              <input
                type="text"
                value={component.config.buttonText}
                onChange={(e) => onUpdate({ ...component.config, buttonText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                URL da Imagem de Fundo
              </label>
              <input
                type="url"
                value={component.config.backgroundImage}
                onChange={(e) => onUpdate({ ...component.config, backgroundImage: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Título da Seção
              </label>
              <input
                type="text"
                value={component.config.title}
                onChange={(e) => onUpdate({ ...component.config, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Recursos
              </label>
              {component.config.items.map((item: any, index: number) => (
                <div key={index} className="mb-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const newItems = [...component.config.items];
                      newItems[index].title = e.target.value;
                      onUpdate({ ...component.config, items: newItems });
                    }}
                    placeholder="Título do recurso"
                    className="w-full px-3 py-2 mb-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...component.config.items];
                      newItems[index].description = e.target.value;
                      onUpdate({ ...component.config, items: newItems });
                    }}
                    placeholder="Descrição"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded text-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Título da Seção
              </label>
              <input
                type="text"
                value={component.config.title}
                onChange={(e) => onUpdate({ ...component.config, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={component.config.showPrice}
                  onChange={(e) => onUpdate({ ...component.config, showPrice: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Mostrar Preços</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Colunas
              </label>
              <select
                value={component.config.columns}
                onChange={(e) => onUpdate({ ...component.config, columns: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="2">2 Colunas</option>
                <option value="3">3 Colunas</option>
                <option value="4">4 Colunas</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Produtos
                </label>
                <button
                  onClick={() => {
                    const newItems = [...(component.config.items || []), {
                      name: 'Novo Produto',
                      description: 'Descrição do produto',
                      price: 99.90,
                      image: ''
                    }];
                    onUpdate({ ...component.config, items: newItems });
                  }}
                  className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  + Adicionar Produto
                </button>
              </div>
              {(component.config.items || []).map((item: any, index: number) => (
                <div key={index} className="mb-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Produto {index + 1}</span>
                    <button
                      onClick={() => {
                        const newItems = component.config.items.filter((_: any, i: number) => i !== index);
                        onUpdate({ ...component.config, items: newItems });
                      }}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const newItems = [...component.config.items];
                      newItems[index].name = e.target.value;
                      onUpdate({ ...component.config, items: newItems });
                    }}
                    placeholder="Nome do produto"
                    className="w-full px-3 py-2 mb-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded text-slate-900 dark:text-white text-sm"
                  />
                  <textarea
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...component.config.items];
                      newItems[index].description = e.target.value;
                      onUpdate({ ...component.config, items: newItems });
                    }}
                    placeholder="Descrição"
                    rows={2}
                    className="w-full px-3 py-2 mb-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded text-slate-900 dark:text-white text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => {
                      const newItems = [...component.config.items];
                      newItems[index].price = parseFloat(e.target.value) || 0;
                      onUpdate({ ...component.config, items: newItems });
                    }}
                    placeholder="Preço"
                    className="w-full px-3 py-2 mb-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded text-slate-900 dark:text-white text-sm"
                  />
                  <input
                    type="url"
                    value={item.image}
                    onChange={(e) => {
                      const newItems = [...component.config.items];
                      newItems[index].image = e.target.value;
                      onUpdate({ ...component.config, items: newItems });
                    }}
                    placeholder="URL da imagem (opcional)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded text-slate-900 dark:text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Título
              </label>
              <input
                type="text"
                value={component.config.title}
                onChange={(e) => onUpdate({ ...component.config, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Texto do Botão
              </label>
              <input
                type="text"
                value={component.config.buttonText}
                onChange={(e) => onUpdate({ ...component.config, buttonText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                💡 A cor de fundo usa automaticamente a cor principal do tema
              </p>
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Texto do Rodapé
              </label>
              <input
                type="text"
                value={component.config.text}
                onChange={(e) => onUpdate({ ...component.config, text: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Links (separados por vírgula)
              </label>
              <input
                type="text"
                value={component.config.links.join(', ')}
                onChange={(e) => onUpdate({ 
                  ...component.config, 
                  links: e.target.value.split(',').map(link => link.trim()) 
                })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>
        );

      default:
        return <div className="text-sm text-slate-500">Editor não disponível para este componente</div>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white"
        >
          <Settings className="w-4 h-4" />
          {component.type.charAt(0).toUpperCase() + component.type.slice(1)}
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mover para cima"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mover para baixo"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            title="Duplicar"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            title="Remover"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      {isExpanded && (
        <div className="p-4">
          {renderEditor()}
        </div>
      )}
    </div>
  );
}
