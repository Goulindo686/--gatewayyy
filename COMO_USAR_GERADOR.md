# 🚀 Como Usar o Gerador Inteligente - Guia Rápido

## ✅ O Que Foi Criado

Um sistema completo de geração de sites e lojas com:

### Frontend
- ✅ Página principal do gerador (`/gerador`)
- ✅ Seleção de templates (Página de Vendas, Loja, Landing Page, Personalizado)
- ✅ Editor visual de componentes
- ✅ Preview em tempo real
- ✅ Personalização de tema (cores, fontes)
- ✅ Link no menu do dashboard

### Backend
- ✅ API completa para CRUD de páginas
- ✅ Exportação de HTML
- ✅ Sistema de publicação
- ✅ Contador de visualizações
- ✅ Estatísticas

### Banco de Dados
- ✅ Schema SQL com tabela `generated_pages`
- ✅ RLS (Row Level Security) configurado
- ✅ Índices para performance

## 📦 Instalação

### 1. Criar a Tabela no Banco de Dados

Execute o SQL no seu Supabase:

```bash
# Copie o conteúdo do arquivo:
backend/src/config/generator_schema.sql

# E execute no SQL Editor do Supabase
```

Ou via terminal:
```bash
psql -U postgres -d seu_banco -f "backend/src/config/generator_schema.sql"
```

### 2. Reiniciar o Backend

O backend já está configurado com as rotas. Apenas reinicie:

```bash
cd "GATEWAY/GATEWAY DE PAGAMENTOS/backend"
npm run dev
```

### 3. Reiniciar o Frontend

```bash
cd "GATEWAY/GATEWAY DE PAGAMENTOS/frontend"
npm run dev
```

## 🎯 Como Usar

### Passo 1: Acessar o Gerador

1. Faça login no sistema
2. No menu lateral do dashboard, clique em **"Gerador Inteligente"** (ícone de raio ⚡)
3. Você será redirecionado para `/gerador`

### Passo 2: Escolher Template

Escolha um dos 4 templates disponíveis:

1. **Página de Vendas** 📄
   - Hero + Features + Testimonials + CTA + Footer
   - Ideal para vender produtos/serviços

2. **Loja Completa** 🛍️
   - Hero + Catálogo de Produtos + CTA + Footer
   - Ideal para e-commerce

3. **Landing Page** 🎯
   - Hero + Features + CTA
   - Ideal para captura de leads

4. **Personalizado** ✨
   - Comece do zero
   - Adicione os componentes que quiser

### Passo 3: Editar Componentes

No **Editor**:

- **Barra Lateral Esquerda**: 
  - Lista de componentes disponíveis
  - Personalização de tema (cores, fontes)

- **Área Central**:
  - Componentes adicionados
  - Clique para expandir e editar
  - Use os botões:
    - ⬆️ Mover para cima
    - ⬇️ Mover para baixo
    - 📋 Duplicar
    - 🗑️ Remover

### Passo 4: Personalizar Tema

Na barra lateral, configure:
- **Cor Principal**: Cor primária do site
- **Cor Secundária**: Cor de destaque
- **Fonte**: Escolha entre Inter, Roboto, Poppins, Montserrat
- **Cor de Fundo**: Cor de fundo da página

### Passo 5: Preview

Clique no botão **"Preview"** no topo para ver como ficará a página final.

### Passo 6: Salvar

Clique em **"Salvar"** para guardar o progresso.

### Passo 7: Publicar

Marque a página como **"Publicada"** para torná-la acessível publicamente.

Sua página ficará disponível em:
```
https://seudominio.com/api/generator/public/seu-slug
```

### Passo 8: Exportar (Opcional)

Clique em **"Exportar"** para baixar o HTML completo e hospedar onde quiser.

## 🎨 Componentes Disponíveis

### 1. Header (Cabeçalho)
- Logo/Nome da marca
- Menu de navegação
- Personalizável

### 2. Hero Section
- Título principal
- Subtítulo
- Botão de ação (CTA)
- Imagem de fundo (opcional)

### 3. Features (Recursos)
- Título da seção
- Grade de benefícios
- Ícones e descrições

### 4. Products (Produtos)
- Título da seção
- Catálogo de produtos
- Opção de mostrar/ocultar preços
- 2, 3 ou 4 colunas

### 5. Testimonials (Depoimentos)
- Título da seção
- Depoimentos de clientes
- Avaliações com estrelas

### 6. Call to Action (CTA)
- Título
- Botão de ação
- Cor de fundo personalizável

### 7. Footer (Rodapé)
- Texto de copyright
- Links úteis
- Informações de contato

## 🔧 API Endpoints

### Criar Página
```javascript
POST /api/generator/pages
Authorization: Bearer {token}

{
  "name": "Minha Loja",
  "slug": "minha-loja",
  "template": "store",
  "theme": {...},
  "components": [...],
  "isPublished": false
}
```

### Listar Páginas
```javascript
GET /api/generator/pages?page=1&limit=10
Authorization: Bearer {token}
```

### Atualizar Página
```javascript
PUT /api/generator/pages/:pageId
Authorization: Bearer {token}

{
  "name": "Novo Nome",
  "isPublished": true
}
```

### Deletar Página
```javascript
DELETE /api/generator/pages/:pageId
Authorization: Bearer {token}
```

### Exportar HTML
```javascript
GET /api/generator/pages/:pageId/export
Authorization: Bearer {token}
```

### Ver Página Pública
```javascript
GET /api/generator/public/:slug
// Sem autenticação necessária
```

## 💡 Exemplos de Uso

### Exemplo 1: Criar Página de Vendas

1. Acesse `/gerador`
2. Escolha "Página de Vendas"
3. Edite o Hero:
   - Título: "Transforme Seu Negócio Hoje"
   - Subtítulo: "A solução completa para suas vendas online"
   - Botão: "Começar Agora"
4. Personalize as cores da sua marca
5. Adicione depoimentos de clientes
6. Salve e publique

### Exemplo 2: Criar Loja Online

1. Acesse `/gerador`
2. Escolha "Loja Completa"
3. Configure o catálogo de produtos
4. Escolha 3 colunas
5. Ative "Mostrar Preços"
6. Personalize cores e fontes
7. Exporte o HTML

### Exemplo 3: Landing Page de Captura

1. Acesse `/gerador`
2. Escolha "Landing Page"
3. Crie um Hero impactante
4. Adicione 3 benefícios principais
5. Configure um CTA forte
6. Publique e compartilhe o link

## 🎯 Próximos Passos

### Melhorias Futuras

1. **Drag & Drop Visual**
   - Arrastar componentes para reordenar
   - Interface mais intuitiva

2. **Mais Componentes**
   - Formulários de contato
   - Galeria de imagens
   - Vídeos
   - Contadores
   - Mapas

3. **Integração com Produtos**
   - Conectar com produtos do marketplace
   - Checkout integrado
   - Carrinho de compras

4. **SEO e Analytics**
   - Meta tags automáticas
   - Google Analytics
   - Facebook Pixel
   - Sitemap

5. **Domínio Personalizado**
   - Conectar domínio próprio
   - SSL automático
   - CDN

## 🐛 Troubleshooting

### Erro: "Tabela não encontrada"
**Solução**: Execute o SQL do schema no banco de dados

### Erro: "Rota não encontrada"
**Solução**: Reinicie o backend após adicionar as rotas

### Página não aparece no menu
**Solução**: Limpe o cache do navegador (Ctrl+Shift+R)

### Não consigo salvar
**Solução**: Verifique se está autenticado e o token é válido

## 📞 Suporte

Para dúvidas ou problemas:
- Consulte a documentação completa em `GERADOR_INTELIGENTE.md`
- Verifique os logs do backend
- Entre em contato com o suporte

---

**Desenvolvido com ❤️ para o GouPay**
