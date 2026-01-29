# Plano: Sistema de Geração e Envio de E-mails com IA

## Resumo
Implementar sistema completo de geração automatizada de e-mails personalizados usando OpenAI API e envio via Gmail API OAuth2, integrado à grid existente de estabelecimentos.

---

## 1. Arquitetura de Dados

### 1.1 Nova Tabela: `generated_emails`

```sql
CREATE TABLE IF NOT EXISTS generated_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, failed
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    error_message TEXT,
    UNIQUE(establishment_id, status) -- apenas 1 draft ativo por estabelecimento
);

CREATE INDEX IF NOT EXISTS idx_generated_emails_establishment ON generated_emails(establishment_id);
CREATE INDEX IF NOT EXISTS idx_generated_emails_status ON generated_emails(status);
```

### 1.2 Nova Tabela: `email_config`

```sql
CREATE TABLE IF NOT EXISTS email_config (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- singleton
    gmail_refresh_token TEXT,    -- Gerado via OAuth flow
    gmail_access_token TEXT,     -- Gerado via OAuth flow
    gmail_token_expiry DATETIME, -- Expiry do access token
    user_email TEXT,             -- Email do usuário autenticado
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Justificativa:** Armazena apenas tokens OAuth dinâmicos que são gerados em runtime. Credenciais fixas (OpenAI key, Gmail Client ID/Secret) ficam no `.env` e nunca entram no banco de dados por segurança.

---

## 2. Backend - Estrutura de Arquivos

```
backend/src/
├── api/
│   ├── routes/
│   │   ├── emails.ts          # NEW: rotas de e-mail
│   │   └── config.ts          # NEW: configurações API
│   └── server.ts              # MODIFICAR: adicionar rotas
├── services/
│   ├── openai.ts              # NEW: serviço OpenAI
│   ├── gmail.ts               # NEW: serviço Gmail OAuth2
│   └── emailGenerator.ts      # NEW: lógica de geração
├── db/
│   └── schema.sql             # MODIFICAR: adicionar tabelas
└── types/
    └── email.ts               # NEW: tipos de e-mail
```

---

## 3. Backend - Endpoints da API

### 3.1 Configuração
```
POST   /api/config/gmail/auth     # Iniciar OAuth flow
GET    /api/config/gmail/callback # Callback OAuth (redirect do Google)
GET    /api/config/status         # Status das configurações (OpenAI + Gmail)
```

### 3.2 Geração de E-mails
```
POST   /api/emails/generate/:establishmentId  # Gerar e-mail com IA
GET    /api/emails/:establishmentId           # Buscar e-mail existente
DELETE /api/emails/:id                        # Deletar draft
```

### 3.3 Envio de E-mails
```
POST   /api/emails/send/:id                   # Enviar e-mail individual
POST   /api/emails/send-batch                 # Envio em massa
GET    /api/emails/batch-status/:batchId      # Status do batch
```

---

## 4. Backend - Implementação Detalhada

### 4.1 Serviço OpenAI (`services/openai.ts`)

```typescript
import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada no .env');
    }
    this.client = new OpenAI({ apiKey });
  }

  async generateEmail(params: {
    establishmentName: string;
    category: string;
    city: string;
    uf: string;
  }): Promise<{ subject: string; body: string }> {
    const prompt = `
      Gere um e-mail profissional personalizado para solicitar vaga de estágio.

      Contexto:
      - Candidata: Ketlin Tibes, formanda em Biomedicina pela UNOESC Joaçaba
      - Estabelecimento: ${params.establishmentName}
      - Área: ${this.getCategoryDescription(params.category)}
      - Localização: ${params.city}/${params.uf}

      Template base:
      [template fornecido pelo usuário]

      Instruções:
      1. Mantenha o tom profissional e pessoal
      2. Adapte o texto para a área específica do estabelecimento
      3. Mencione interesse específico na área de atuação
      4. Mantenha todos os dados pessoais (telefone, universidade, etc)
      5. NÃO pareça mensagem automática em massa
      6. Retorne no formato JSON: { "subject": "...", "body": "..." }
    `;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });

    return JSON.parse(response.choices[0].message.content);
  }

  private getCategoryDescription(category: string): string {
    // Mapeamento categoria -> descrição amigável
  }
}
```

**Custo estimado:** ~$0.0001 por e-mail (gpt-4o-mini)

### 4.2 Serviço Gmail (`services/gmail.ts`)

```typescript
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'http://localhost:3001/api/config/gmail/callback'
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.send'],
    });
  }

  async handleCallback(code: string): Promise<TokenData> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    accessToken: string;
    refreshToken: string;
  }): Promise<void> {
    this.oauth2Client.setCredentials({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    const message = [
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      '',
      params.body,
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
  }
}
```

**Limites Gmail API:** 250 e-mails/dia (quota padrão), pode solicitar aumento até 10.000/dia.

### 4.3 Rate Limiting para Envio em Massa

```typescript
// services/emailBatchProcessor.ts
import pLimit from 'p-limit';

export class EmailBatchProcessor {
  private queue: EmailJob[] = [];
  private isProcessing = false;

  async processBatch(establishmentIds: number[]): Promise<string> {
    const batchId = crypto.randomUUID();

    // Adicionar à fila
    for (const id of establishmentIds) {
      this.queue.push({ batchId, establishmentId: id, status: 'pending' });
    }

    // Iniciar processamento assíncrono
    this.processQueue();

    return batchId;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();

      try {
        // 1. Gerar e-mail se não existe
        // 2. Enviar e-mail
        // 3. Atualizar status

        // Rate limiting: 30 segundos entre envios
        await this.delay(30000);
      } catch (error) {
        // Registrar erro no banco
      }
    }

    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 5. Frontend - Componentes

### 5.1 Modificação em `DataTable.tsx`

Adicionar nova coluna "Ações":

```typescript
{
  id: 'actions',
  header: 'Ações',
  size: 120,
  cell: ({ row }) => (
    <EmailActions
      establishmentId={row.original.id}
      hasEmail={row.original.emails}
    />
  )
}
```

### 5.2 Novo Componente: `EmailActions.tsx`

```typescript
interface EmailActionsProps {
  establishmentId: number;
  hasEmail: string | null;
}

export function EmailActions({ establishmentId, hasEmail }: EmailActionsProps) {
  const { data: generatedEmail, refetch } = useGeneratedEmail(establishmentId);
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = async () => {
    if (generatedEmail) {
      setShowModal(true); // Mostrar e-mail existente
    } else {
      await generateEmail(establishmentId);
      refetch();
    }
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleGenerate} disabled={!hasEmail}>
        {generatedEmail ? '📧 Ver' : '✨ Gerar'}
      </button>

      {generatedEmail && generatedEmail.status === 'draft' && (
        <button onClick={() => sendEmail(generatedEmail.id)}>
          📤 Enviar
        </button>
      )}

      {generatedEmail && generatedEmail.status === 'sent' && (
        <span className="text-green-600">✅ Enviado</span>
      )}

      {showModal && (
        <EmailModal
          email={generatedEmail}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
```

### 5.3 Novo Componente: `EmailModal.tsx`

Modal para exibir/editar e-mail gerado:
- Mostrar assunto e corpo
- Botão "Editar" (opcional, para ajustar texto)
- Botão "Enviar Agora"
- Botão "Fechar"

### 5.4 Novo Componente: `BatchEmailSender.tsx`

Interface de seleção múltipla e envio em massa:
- Checkboxes na grid
- Botão "Processar Selecionados (X)"
- Barra de progresso em tempo real
- Log de erros/sucessos

### 5.5 Novo Hook: `useGeneratedEmail.ts`

```typescript
export function useGeneratedEmail(establishmentId: number) {
  return useQuery({
    queryKey: ['generated-email', establishmentId],
    queryFn: async () => {
      const res = await fetch(`/api/emails/${establishmentId}`);
      if (res.status === 404) return null;
      return res.json();
    },
  });
}

export function useGenerateEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (establishmentId: number) => {
      const res = await fetch(`/api/emails/generate/${establishmentId}`, {
        method: 'POST',
      });
      return res.json();
    },
    onSuccess: (_, establishmentId) => {
      queryClient.invalidateQueries(['generated-email', establishmentId]);
    },
  });
}
```

---

## 6. Fluxo de Dados

### 6.1 Fluxo: Gerar E-mail

```
1. Usuário clica "Gerar E-mail"
2. Frontend: GET /api/emails/:establishmentId
   - Se existe: mostrar modal
   - Se não existe: continuar
3. Frontend: POST /api/emails/generate/:establishmentId
4. Backend:
   a. Buscar dados do estabelecimento (JOIN cities)
   b. Instanciar OpenAIService (lê OPENAI_API_KEY do .env)
   c. Chamar OpenAIService.generateEmail()
   d. Salvar em generated_emails (status='draft')
   e. Retornar { id, subject, body }
5. Frontend: Mostrar modal com e-mail gerado
```

### 6.2 Fluxo: Enviar E-mail

```
1. Usuário clica "Enviar E-mail"
2. Frontend: POST /api/emails/send/:id
3. Backend:
   a. Buscar generated_emails + email_config
   b. Validar: recipient_email existe, status='draft'
   c. Chamar GmailService.sendEmail()
   d. Atualizar: status='sent', sent_at=NOW()
   e. Em caso de erro: status='failed', error_message
4. Frontend: Atualizar UI (mostrar ✅ ou erro)
```

### 6.3 Fluxo: Envio em Massa

```
1. Usuário seleciona N estabelecimentos (checkboxes)
2. Usuário clica "Processar Selecionados"
3. Frontend: POST /api/emails/send-batch { ids: [...] }
4. Backend:
   a. Criar batchId
   b. Adicionar jobs à fila
   c. Retornar batchId imediatamente
   d. Processar em background:
      - Para cada ID:
        i.  Gerar e-mail (se não existe)
        ii. Enviar e-mail
        iii. Aguardar 30 segundos
5. Frontend: Poll GET /api/emails/batch-status/:batchId
   - Mostrar progresso: X/N enviados
   - Mostrar erros em tempo real
```

---

## 7. Segurança e Configuração

### 7.1 Variáveis de Ambiente (`.env`)

**IMPORTANTE:** Todas as credenciais fixas/sensíveis devem estar no `.env` (nunca no banco de dados).

```bash
# OpenAI API (obrigatório)
OPENAI_API_KEY=sk-proj-...     # Copiar do dashboard OpenAI

# Gmail OAuth2 Credentials (obrigatório)
GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com    # Google Cloud Console
GMAIL_CLIENT_SECRET=GOCSPX-...                    # Google Cloud Console

# Database
DATABASE_PATH=./data/varredura.db
```

**Fluxo de credenciais:**
- `.env` → Credenciais fixas que você copia manualmente
- `email_config` (banco) → Apenas tokens OAuth gerados dinamicamente pelo fluxo de autorização

### 7.2 OAuth2 Flow do Gmail

**Setup (uma vez):**
1. Criar projeto no Google Cloud Console
2. Habilitar Gmail API
3. Configurar OAuth consent screen
4. Criar credenciais OAuth 2.0 (tipo "Desktop app" ou "Web app")
5. Adicionar redirect URI: `http://localhost:3001/api/config/gmail/callback`

**Fluxo no app:**
1. Usuário clica "Conectar Gmail" na UI
2. Backend retorna URL de autorização
3. Usuário autoriza no Google
4. Google redireciona para callback com `code`
5. Backend troca `code` por `access_token` + `refresh_token`
6. Salvar tokens em `email_config`

### 7.3 Segurança

**Armazenamento de Credenciais:**
- ✅ **API Keys fixas:** `.env` (OpenAI key, Gmail Client ID/Secret)
- ✅ **Tokens OAuth:** Banco `email_config` (gerados dinamicamente, podem ser revogados)
- ✅ **`.env` no `.gitignore`:** Nunca commitar credenciais no git
- ⚠️ **Banco SQLite:** Garantir permissões 600 (somente owner) em produção

**Produção:**
- Migrar `.env` para AWS Secrets Manager / Azure Key Vault / Docker secrets
- Considerar criptografia dos tokens OAuth no banco (AES-256)

**Validações e Proteções:**
- Rate limiting global (express-rate-limit): 100 req/min por IP
- Validar establishment_id existe e pertence aos dados do sistema
- Sanitizar inputs antes de enviar para OpenAI (evitar prompt injection)
- CORS configurado apenas para frontend específico
- Validação de formato de e-mail antes de enviar

---

## 8. Dependências NPM

### Backend
```json
{
  "openai": "^4.20.0",
  "googleapis": "^128.0.0",
  "google-auth-library": "^9.0.0",
  "express-rate-limit": "^7.1.0",
  "p-limit": "^5.0.0"
}
```

### Frontend
```json
{
  "@tanstack/react-query": "^5.17.0"  // se ainda não tiver
}
```

---

## 9. Arquivos Críticos a Modificar

1. **Backend:**
   - `backend/src/db/schema.sql` - Adicionar tabelas
   - `backend/src/api/server.ts` - Registrar rotas
   - Criar `backend/src/api/routes/emails.ts`
   - Criar `backend/src/services/openai.ts`
   - Criar `backend/src/services/gmail.ts`
   - Criar `backend/src/services/emailBatchProcessor.ts`

2. **Frontend:**
   - `frontend/src/components/DataTable.tsx` - Adicionar coluna Ações
   - Criar `frontend/src/components/EmailActions.tsx`
   - Criar `frontend/src/components/EmailModal.tsx`
   - Criar `frontend/src/components/BatchEmailSender.tsx`
   - Criar `frontend/src/hooks/useEmail.ts`
   - `frontend/src/types/index.ts` - Adicionar tipos de e-mail

---

## 10. Tratamento de Erros

### Cenários
1. **Estabelecimento sem e-mail:** Desabilitar botão "Gerar" / mostrar tooltip
2. **OpenAI API error:** Exibir mensagem, permitir retry
3. **Gmail quota excedida:** Pausar batch, notificar usuário
4. **Token expirado:** Auto-refresh usando refresh_token
5. **E-mail inválido:** Validar antes de enviar, marcar como erro

### Logs
- Registrar todas as tentativas em `generated_emails` com error_message
- Console/arquivo para debug de API calls

---

## 11. Melhorias Futuras

1. **Editor de Template:** Interface para editar template base sem código
2. **Múltiplos Templates:** Diferentes modelos por categoria
3. **Histórico Completo:** View de todos os e-mails enviados (não só último)
4. **Anexos:** Suporte a currículo PDF
5. **Agendamento:** Enviar em horário específico
6. **Webhooks:** Notificar quando lote terminar
7. **Analytics:** Taxa de resposta (requer tracking pixels)

---

## 12. Verificação e Testes

### Testes Manuais End-to-End

1. **Configuração:**
   - [ ] Adicionar OPENAI_API_KEY no arquivo `.env`
   - [ ] Adicionar GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no `.env`
   - [ ] Completar OAuth flow do Gmail (autorizar via browser)
   - [ ] Verificar tokens OAuth salvos na tabela `email_config`

2. **Geração:**
   - [ ] Clicar "Gerar E-mail" em estabelecimento COM e-mail
   - [ ] Verificar modal mostra e-mail personalizado
   - [ ] Clicar novamente e verificar que mostra mesmo e-mail (não gera outro)
   - [ ] Verificar registro em `generated_emails`

3. **Envio:**
   - [ ] Clicar "Enviar E-mail"
   - [ ] Verificar e-mail chegou na caixa de destino
   - [ ] Verificar status mudou para 'sent' no banco
   - [ ] Verificar UI mostra ✅

4. **Batch:**
   - [ ] Selecionar 5 estabelecimentos
   - [ ] Clicar "Processar Selecionados"
   - [ ] Verificar progresso em tempo real
   - [ ] Verificar intervalo de 30s entre envios
   - [ ] Verificar todos chegaram

5. **Erros:**
   - [ ] Tentar enviar sem configurar Gmail (deve falhar com mensagem clara)
   - [ ] Tentar enviar para estabelecimento sem e-mail (botão desabilitado)
   - [ ] Simular erro OpenAI (key inválida) e verificar mensagem

### Testes Unitários (opcional)
- `openai.ts`: Mock da API, testar parsing de resposta
- `gmail.ts`: Mock do OAuth flow
- `emailBatchProcessor.ts`: Testar rate limiting

---

## 13. Estimativa de Custos

### OpenAI API (gpt-4o-mini)
- **Input:** ~500 tokens/e-mail (template + dados)
- **Output:** ~400 tokens/e-mail
- **Custo:** $0.150/1M input + $0.600/1M output
- **Por e-mail:** ~$0.0001 (praticamente grátis)
- **1000 e-mails:** ~$0.10

### Gmail API
- **Quota:** 250 envios/dia (free)
- **Custo:** Gratuito até 1 bilhão de requests/dia

**Total para 1000 estabelecimentos:** < $1.00

---

## 14. Cronograma Sugerido

### Fase 1: Infraestrutura (2-3 horas)
- Schema do banco
- Configuração OpenAI
- Configuração Gmail OAuth

### Fase 2: Backend Core (3-4 horas)
- Rotas de geração
- Integração OpenAI
- Integração Gmail

### Fase 3: Frontend Básico (2-3 horas)
- Botões na grid
- Modal de visualização
- Hooks de API

### Fase 4: Batch Processing (2-3 horas)
- Sistema de filas
- Rate limiting
- UI de progresso

### Fase 5: Testes e Refinamentos (2 horas)
- Testes end-to-end
- Tratamento de erros
- UX polish

**Total estimado:** 11-15 horas de desenvolvimento

---

## Conclusão

Este plano implementa um sistema robusto, seguro e escalável para automatizar o processo de geração e envio de e-mails personalizados. A arquitetura separa claramente as responsabilidades (geração vs envio), permite crescimento futuro (templates múltiplos, analytics) e respeita limites de API com rate limiting adequado.
