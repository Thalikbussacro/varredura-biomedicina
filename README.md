# Sistema de Varredura de Estabelecimentos para Estágio em Biomedicina (Sul do Brasil)

Sistema completo de coleta, enriquecimento e visualização de dados de estabelecimentos no Sul do Brasil (RS, SC, PR) onde biomédicos podem realizar estágio.

## 🎯 Objetivo

Coletar e organizar informações de:
- Clínicas de reprodução humana assistida
- Laboratórios de genética e citogenética
- Laboratórios de análises clínicas (com foco em andrologia)
- Hospitais com serviços de reprodução/maternidade
- Centros de diagnóstico molecular
- Bancos de sangue de cordão/gametas

## 📊 Resultado Esperado

- **300-500 estabelecimentos** catalogados
- **~130 cidades** com população > 30.000 habitantes
- **50-70% dos estabelecimentos** com informações de contato enriquecidas
- **Custo**: ~R$100 (utilizando Serper API free tier)

## 🛠️ Stack Tecnológica

### Backend
- Node.js 20+
- TypeScript 5+
- SQLite (via better-sqlite3)
- Express.js
- Axios & Cheerio (scraping)
- p-limit (controle de concorrência)

### Frontend
- React 18+
- Vite
- TypeScript
- TanStack Table (tabela com ordenação)
- Tailwind CSS

## 📋 Pré-requisitos

- Node.js 20 ou superior
- NPM ou Yarn
- Chave da API Serper (gratuita até 2.500 buscas)
  - Cadastre-se em: https://serper.dev/

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone <repository-url>
cd varredurar-biomedica
```

### 2. Instale as dependências do backend

```bash
cd backend
npm install
```

### 3. Instale as dependências do frontend

```bash
cd ../frontend
npm install
```

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na pasta `backend` baseado no `.env.example`:

```bash
cd ../backend
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua chave da API Serper:

```env
SERPER_API_KEY=sua_chave_aqui
MIN_POPULATION=30000
RATE_LIMIT_MS=1000
CONCURRENT_REQUESTS=3
API_PORT=3001
DB_PATH=../data/leads.db
```

## 📦 Executando o Pipeline de Coleta

O pipeline coleta dados do IBGE, REDLARA, Serper API e enriquece com crawling de sites.

**⚠️ Importante**: A execução completa leva entre 30-60 minutos.

```bash
cd backend
npm run pipeline
```

O pipeline executa as seguintes etapas:
1. ✅ Inicializa o banco de dados SQLite
2. 🏙️ Coleta cidades do IBGE (população > 30k)
3. 🔬 Coleta centros da REDLARA
4. 🔍 Busca estabelecimentos via Serper API
5. 🧹 Remove duplicatas
6. 🌐 Enriquece com crawling de sites (contatos)
7. 🧹 Remove duplicatas finais

## 🖥️ Executando a Aplicação

### Iniciar o Backend (API)

```bash
cd backend
npm run dev
```

A API estará disponível em: http://localhost:3001

Endpoints disponíveis:
- `GET /api/stats` - Estatísticas gerais
- `GET /api/establishments` - Lista estabelecimentos (com filtros)
- `GET /api/establishments/categories` - Lista categorias
- `GET /api/establishments/cities` - Lista cidades
- `GET /api/export/csv` - Exporta CSV (com filtros)

### Iniciar o Frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

A aplicação estará disponível em: http://localhost:5173

## 💡 Como Usar

1. **Filtrar Estabelecimentos**:
   - Selecione um **Estado** (RS, SC, PR)
   - Escolha uma **Cidade** específica (opcional)
   - Filtre por **Categoria** (opcional)
   - Use o campo **Buscar** para pesquisar por nome

2. **Ordenar Resultados**:
   - Clique nos **cabeçalhos das colunas** para ordenar
   - Clique novamente para inverter a ordem

3. **Exportar Dados**:
   - Clique no botão **Exportar CSV**
   - O arquivo será baixado com os filtros aplicados
   - Compatível com Excel (UTF-8 com BOM)

## 📁 Estrutura do Projeto

```
varredurar-biomedica/
├── backend/
│   ├── src/
│   │   ├── api/              # Express API e rotas
│   │   ├── collectors/       # Coletores de dados (IBGE, REDLARA, Serper)
│   │   ├── config/           # Configurações e keywords
│   │   ├── db/               # Schema e conexão SQLite
│   │   ├── enrichment/       # Crawler de enriquecimento
│   │   ├── utils/            # Utilidades (normalize, delay, dedupe)
│   │   ├── pipeline.ts       # Orquestrador do pipeline
│   │   └── index.ts          # Entry point do backend
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── hooks/            # Custom hooks
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx           # Componente principal
│   │   └── main.tsx          # Entry point do frontend
│   └── package.json
├── data/
│   └── leads.db              # Banco SQLite (criado após pipeline)
├── scripts/
│   └── run-pipeline.ts       # Script de execução do pipeline
└── README.md
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas

- **cities**: Cidades do Sul do Brasil (UF, nome, código IBGE, população)
- **establishments**: Estabelecimentos encontrados (nome, categoria, endereço, website)
- **contacts**: Contatos extraídos (telefone, email, WhatsApp, redes sociais)
- **search_log**: Log de buscas realizadas (rastreamento de uso da API Serper)

### Categorias

- `REPRODUCAO_HUMANA` - Clínicas de reprodução assistida
- `LABORATORIO_GENETICA` - Laboratórios de genética/citogenética
- `LABORATORIO_ANDROLOGIA` - Laboratórios de andrologia
- `LABORATORIO_ANALISES` - Laboratórios de análises clínicas
- `HOSPITAL` - Hospitais com maternidade/reprodução
- `OUTROS` - Outros estabelecimentos relevantes

## 🔍 Fontes de Dados

1. **IBGE** - Cidades e população
   - API pública do IBGE
   - Filtra cidades com > 30.000 habitantes

2. **REDLARA** - Centros de reprodução humana
   - Registro Latino-Americano de Reprodução Assistida
   - https://www.redlara.com/

3. **Serper API** - Busca no Google
   - 8 keywords por cidade (~1.040 buscas totais)
   - Filtra resultados irrelevantes (redes sociais, portais de emprego)

4. **Web Crawling** - Enriquecimento de contatos
   - Extrai emails, telefones, WhatsApp, Instagram, Facebook, LinkedIn
   - Busca páginas de contato automaticamente

## ⚙️ Configurações Avançadas

### Ajustar Rate Limiting

Edite o arquivo `.env`:

```env
RATE_LIMIT_MS=1000           # Delay entre requisições (ms)
CONCURRENT_REQUESTS=3        # Requisições simultâneas
```

### Alterar População Mínima

```env
MIN_POPULATION=30000         # População mínima das cidades
```

### Alterar Porta da API

```env
API_PORT=3001                # Porta do servidor Express
```

## 🐛 Troubleshooting

### Pipeline falha com erro de API

- Verifique se a `SERPER_API_KEY` está correta no `.env`
- Confirme que não excedeu o limite de 2.500 buscas gratuitas
- Aguarde alguns minutos se receber erro 429 (rate limit)

### Banco de dados não é criado

- Verifique permissões na pasta `data/`
- Execute manualmente: `mkdir -p data`

### Frontend não carrega dados

- Certifique-se de que o backend está rodando em `http://localhost:3001`
- Verifique o console do navegador para erros de CORS
- Confirme que o banco de dados existe em `data/leads.db`

### Erro de módulos ES6

- Certifique-se de que `"type": "module"` está no `package.json`
- Use extensões `.js` nos imports (mesmo para arquivos `.ts`)

## 📝 Scripts Disponíveis

### Backend

```bash
npm run dev       # Inicia servidor de desenvolvimento
npm run build     # Compila TypeScript para JavaScript
npm run start     # Executa versão compilada
npm run pipeline  # Executa pipeline de coleta
```

### Frontend

```bash
npm run dev       # Inicia servidor de desenvolvimento Vite
npm run build     # Build de produção
npm run preview   # Preview do build
```

## 🎨 Customização

### Adicionar Novas Keywords

Edite `backend/src/config/index.ts`:

```typescript
export const KEYWORDS = [
  'clínica reprodução humana',
  'sua nova keyword aqui',
  // ...
];
```

### Adicionar Novas Categorias

Edite `backend/src/config/index.ts`:

```typescript
export const CATEGORIES: Record<string, string> = {
  'palavra-chave': 'CATEGORIA_NOVA',
  // ...
};
```

## 📊 Monitoramento de Uso da API

Consulte o log de buscas:

```bash
sqlite3 data/leads.db "SELECT COUNT(*) FROM search_log WHERE source = 'serper';"
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:
1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## ✨ Melhorias Futuras

- [ ] Adicionar mais fontes de dados (SBRA, CRM, CRBM)
- [ ] Implementar score de "chance de aceitar estágio"
- [ ] Geração automática de mensagens personalizadas
- [ ] Atualização incremental dos dados
- [ ] Autenticação no frontend
- [ ] Deploy em servidor para acesso remoto
- [ ] Exportação para outros formatos (Excel, PDF)

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.

---

**Desenvolvido com ❤️ para facilitar a busca por estágios em Biomedicina**
