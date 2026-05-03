# 🎨 Gerador Inteligente de Sites e Lojas

## 📋 Visão Geral

O **Gerador Inteligente** é uma funcionalidade completa que permite aos usuários criarem páginas de vendas, lojas online e landing pages de forma visual e intuitiva, sem necessidade de conhecimento técnico.

## ✨ Funcionalidades Principais

### 1. **Templates Prontos**
- **Página de Vendas**: Otimizada para conversão com seções de benefícios, depoimentos e CTAs
- **Loja Completa**: E-commerce com catálogo de produtos e checkout integrado
- **Landing Page**: Página de captura com foco em conversão
- **Personalizado**: Comece do zero e adicione os componentes que desejar

### 2. **Componentes Disponíveis**
- **Header**: Cabeçalho com logo e menu de navegação
- **Hero Section**: Seção principal de destaque com título, subtítulo e CTA
- **Features**: Grade de benefícios e recursos
- **Products**: Catálogo de produtos com preços
- **Testimonials**: Depoimentos de clientes com avaliações
- **Call to Action**: Botões de ação estratégicos
- **Footer**: Rodapé com informações e links

### 3. **Personalização Completa**
- **Cores**: Escolha cores primárias e secundárias
- **Fontes**: Selecione entre várias famílias de fontes
- **Conteúdo**: Edite textos, imagens e configurações de cada componente
- **Layout**: Arraste e reorganize componentes

### 4. **Preview em Tempo Real**
- Visualize as mudanças instantaneamente
- Modo de edição e preview separados
- Responsivo para diferentes dispositivos

### 5. **Publicação e Exportação**
- **Publicar**: Torne sua página acessível publicamente via URL única
- **Exportar HTML**: Baixe o código HTML/CSS completo
- **Estatísticas**: Acompanhe visualizações e performance

## 🗄️ Estrutura do Banco de Dados

### Tabela: `generated_pages`

```sql
- id: UUID (chave primária)
- user_id: UUID (referência ao usuário)
- name: VARCHAR(255) (nome da página)
- slug: VARCHAR(255) (URL amigável)
- template: VARCHAR(50) (tipo de template)
- theme: JSONB (configurações de tema)
- components: JSONB (array de componentes)
- is_published: BOOLEAN (se está publicada)
- views: INTEGER (contador de visualizações)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## 🔌 API Endpoints

### Rotas Protegidas (Requerem Autenticação)

#### Criar Página
```http
POST /api/generator/pages
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Minha Loja",
  "slug": "minha-loja",
  "template": "store",
  "theme": {
    "primaryColor": "#6366f1",
    "secondaryColor": "#8b5cf6",
    "fontFamily": "Inter",
    "backgroundColor": "#ffffff"
  },
  "components": [...],
  "isPublished": false
}
```

#### Listar Páginas
```http
GET /api/generator/pages?page=1&limit=10
Authorization: Bearer {token}
```

#### Obter Página Específica
```http
GET /api/generator/pages/:pageId
Authorization: Bearer {token}
```

#### Atualizar Página
```http
PUT /api/generator/pages/:pageId
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Novo Nome",
  "isPublished": true
}
```

#### Deletar Página
```http
DELETE /api/generator/pages/:pageId
Authorization: Bearer {token}
```

#### Duplicar Página
```http
POST /api/generator/pages/:pageId/duplicate
Authorization: Bearer {token}
```

#### Exportar como HTML
```http
GET /api/generator/pages/:pageId/export
Authorization: Bearer {token}
```

#### Obter Estatísticas
```http
GET /api/generator/pages/stats
Authorization: Bearer {token}
```

### Rotas Públicas (Sem Autenticação)

#### Visualizar Página Publicada
```http
GET /api/generator/public/:slug
```

## 🚀 Como Usar

### 1. **Acessar o Gerador**
- Navegue para `/gerador` no frontend
- Você verá a tela de seleção de templates

### 2. **Escolher Template**
- Selecione um dos templates prontos ou comece do zero
- O template será carregado com componentes padrão

### 3. **Editar Componentes**
- No modo Editor, você verá:
  - **Barra Lateral Esquerda**: Lista de componentes disponíveis e personalização de tema
  - **Área Central**: Canvas de edição com os componentes adicionados
- Clique em um componente para expandir suas opções de edição
- Use os botões para:
  - ⬆️ Mover para cima
  - ⬇️ Mover para baixo
  - 📋 Duplicar
  - 🗑️ Remover

### 4. **Personalizar Tema**
- Escolha a cor principal
- Escolha a cor secundária
- Selecione a fonte
- Defina a cor de fundo

### 5. **Preview**
- Clique no botão "Preview" para ver como ficará
- Visualize em tempo real todas as mudanças

### 6. **Salvar e Publicar**
- Clique em "Salvar" para guardar o progresso
- Marque como "Publicado" para tornar acessível publicamente
- Sua página ficará disponível em: `https://seudominio.com/p/seu-slug`

### 7. **Exportar**
- Clique em "Exportar" para baixar o HTML completo
- Use o arquivo em qualquer servidor web

## 📱 Integração com Produtos

O gerador pode ser integrado com os produtos do marketplace:

```javascript
// Exemplo de componente de produtos conectado ao backend
{
  type: 'products',
  config: {
    title: 'Nossos Produtos',
    source: 'marketplace', // Buscar do marketplace
    categoryId: 'uuid-da-categoria',
    showPrice: true,
    columns: 3
  }
}
```

## 🎯 Casos de Uso

### 1. **Vendedor de Infoprodutos**
- Cria uma página de vendas para seu curso
- Adiciona depoimentos de alunos
- Integra com checkout do GouPay
- Publica e compartilha o link

### 2. **Loja de Produtos Físicos**
- Usa o template de loja completa
- Adiciona catálogo de produtos
- Personaliza cores da marca
- Exporta e hospeda em domínio próprio

### 3. **Landing Page de Captura**
- Cria página para capturar leads
- Adiciona formulário de contato
- Otimiza para conversão
- Acompanha visualizações

## 🔒 Segurança

- **RLS (Row Level Security)**: Usuários só acessam suas próprias páginas
- **Validação de Slug**: Slugs únicos por usuário
- **Sanitização**: Conteúdo HTML é sanitizado na exportação
- **Rate Limiting**: Proteção contra abuso da API

## 📊 Métricas e Analytics

Cada página rastreia:
- **Visualizações**: Contador automático
- **Data de Criação**: Quando foi criada
- **Última Atualização**: Quando foi editada
- **Status**: Publicada ou rascunho

## 🔄 Próximas Melhorias

### Fase 2
- [ ] Editor drag-and-drop visual
- [ ] Mais templates (blog, portfólio, etc)
- [ ] Integração com Google Analytics
- [ ] SEO automático (meta tags, sitemap)
- [ ] Domínio personalizado

### Fase 3
- [ ] A/B Testing de páginas
- [ ] Heatmaps de cliques
- [ ] Formulários personalizados
- [ ] Integração com email marketing
- [ ] Chatbot integrado

### Fase 4
- [ ] IA para sugestões de conteúdo
- [ ] Geração automática de imagens
- [ ] Otimização automática de conversão
- [ ] Multi-idioma

## 🛠️ Instalação

### 1. **Criar Tabela no Banco**
Execute o script SQL:
```bash
psql -U seu_usuario -d seu_banco -f backend/src/config/generator_schema.sql
```

### 2. **Reiniciar Backend**
```bash
cd backend
npm run dev
```

### 3. **Acessar Frontend**
```bash
cd frontend
npm run dev
```

Acesse: `http://localhost:3000/gerador`

## 📝 Exemplo de Uso da API

```javascript
// Criar uma nova página
const response = await fetch('/api/generator/pages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Minha Primeira Loja',
    slug: 'minha-primeira-loja',
    template: 'store',
    theme: {
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      fontFamily: 'Inter',
      backgroundColor: '#ffffff'
    },
    components: [
      {
        id: 'header-1',
        type: 'header',
        config: {
          logo: 'Minha Marca',
          menuItems: ['Início', 'Produtos', 'Contato']
        }
      },
      {
        id: 'hero-1',
        type: 'hero',
        config: {
          title: 'Bem-vindo à Minha Loja',
          subtitle: 'Os melhores produtos você encontra aqui',
          buttonText: 'Ver Produtos',
          backgroundImage: ''
        }
      }
    ],
    isPublished: true
  })
});

const data = await response.json();
console.log('Página criada:', data);
```

## 🎨 Customização Avançada

### Adicionar Novo Tipo de Componente

1. **Adicione no backend** (`generator.controller.js`):
```javascript
case 'pricing':
  return `
    <section style="padding: 4rem 2rem;">
      <h2>${comp.config.title}</h2>
      <!-- HTML do componente -->
    </section>
  `;
```

2. **Adicione no frontend** (`ComponentEditor.tsx`):
```typescript
case 'pricing':
  return (
    <div>
      <input
        value={component.config.title}
        onChange={(e) => onUpdate({ ...component.config, title: e.target.value })}
      />
    </div>
  );
```

3. **Adicione no preview** (`PagePreview.tsx`):
```typescript
case 'pricing':
  return (
    <section>
      <h2>{component.config.title}</h2>
      {/* Renderização do componente */}
    </section>
  );
```

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no repositório
- Entre em contato com o suporte
- Consulte a documentação completa

---

**Desenvolvido com ❤️ para o GouPay**
