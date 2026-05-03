'use client';

interface PagePreviewProps {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    backgroundColor: string;
  };
  components: Array<{
    id: string;
    type: string;
    config: Record<string, any>;
  }>;
}

export default function PagePreview({ theme, components }: PagePreviewProps) {
  const renderComponent = (component: any) => {
    switch (component.type) {
      case 'header':
        return (
          <header
            key={component.id}
            style={{ backgroundColor: theme.primaryColor }}
            className="p-4 text-white"
          >
            <nav className="max-w-6xl mx-auto flex justify-between items-center">
              <h1 className="text-2xl font-bold">{component.config.logo}</h1>
              <ul className="flex gap-6">
                {component.config.menuItems.map((item: string, index: number) => (
                  <li key={index}>
                    <a href="#" className="hover:underline">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </header>
        );

      case 'hero':
        return (
          <section
            key={component.id}
            style={{
              background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
              backgroundImage: component.config.backgroundImage
                ? `url(${component.config.backgroundImage})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            className="py-24 px-4 text-white text-center relative"
          >
            {component.config.backgroundImage && (
              <div className="absolute inset-0 bg-black/50" />
            )}
            <div className="max-w-4xl mx-auto relative z-10">
              <h1 className="text-5xl font-bold mb-4">{component.config.title}</h1>
              <p className="text-xl mb-8">{component.config.subtitle}</p>
              <button
                style={{ backgroundColor: 'white', color: theme.primaryColor }}
                className="px-8 py-4 rounded-lg text-lg font-bold hover:opacity-90 transition-opacity"
              >
                {component.config.buttonText}
              </button>
            </div>
          </section>
        );

      case 'features':
        return (
          <section key={component.id} className="py-16 px-4 bg-white dark:bg-slate-900">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
                {component.config.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {component.config.items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="p-6 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 transition-colors"
                  >
                    <div
                      style={{ backgroundColor: theme.primaryColor }}
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    >
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'products':
        return (
          <section key={component.id} className="py-16 px-4 bg-slate-50 dark:bg-slate-800">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
                {component.config.title}
              </h2>
              <div
                className={`grid grid-cols-1 md:grid-cols-${component.config.columns} gap-8`}
              >
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="bg-white dark:bg-slate-700 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="h-48 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700" />
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                        Produto {item}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Descrição do produto
                      </p>
                      {component.config.showPrice && (
                        <p
                          style={{ color: theme.primaryColor }}
                          className="text-2xl font-bold mb-4"
                        >
                          R$ 99,90
                        </p>
                      )}
                      <button
                        style={{ backgroundColor: theme.primaryColor }}
                        className="w-full py-3 text-white rounded-lg font-bold hover:opacity-90 transition-opacity"
                      >
                        Comprar Agora
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section key={component.id} className="py-16 px-4 bg-white dark:bg-slate-900">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
                {component.config.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {component.config.items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(item.rating)].map((_, i) => (
                        <svg
                          key={i}
                          style={{ color: theme.primaryColor }}
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mb-4 italic">
                      "{item.text}"
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta':
        return (
          <section
            key={component.id}
            style={{ backgroundColor: component.config.backgroundColor }}
            className="py-16 px-4 text-white text-center"
          >
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold mb-8">{component.config.title}</h2>
              <button className="px-8 py-4 bg-white rounded-lg text-lg font-bold hover:opacity-90 transition-opacity"
                style={{ color: component.config.backgroundColor }}
              >
                {component.config.buttonText}
              </button>
            </div>
          </section>
        );

      case 'footer':
        return (
          <footer
            key={component.id}
            className="py-8 px-4 bg-slate-900 text-white text-center"
          >
            <div className="max-w-6xl mx-auto">
              <p className="mb-4">{component.config.text}</p>
              <div className="flex justify-center gap-6">
                {component.config.links.map((link: string, index: number) => (
                  <a key={index} href="#" className="hover:underline">
                    {link}
                  </a>
                ))}
              </div>
            </div>
          </footer>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        fontFamily: theme.fontFamily,
        backgroundColor: theme.backgroundColor
      }}
      className="w-full min-h-screen"
    >
      {components.map((component) => renderComponent(component))}
      
      {components.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px] text-slate-500">
          <div className="text-center">
            <p className="text-lg mb-2">Nenhum componente adicionado</p>
            <p className="text-sm">Adicione componentes para ver o preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
