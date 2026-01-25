# 🚀 Deploy na Vercel - Passo a Passo

## ⚠️ IMPORTANTE: Configure ANTES de fazer Redeploy

Siga EXATAMENTE estas etapas na ordem:

---

## 1️⃣ Acessar as Configurações do Projeto

1. Vá para: https://vercel.com/dashboard
2. Clique no seu projeto
3. Clique em **Settings** (no topo)

---

## 2️⃣ Configurar Root Directory

Esta é a configuração **MAIS IMPORTANTE**!

1. Em **Settings** → **General**
2. Role até **Build & Development Settings**
3. Clique em **EDIT** (botão à direita)
4. Configure:

   ```
   Root Directory: frontend
   ```

   ⚠️ **ATENÇÃO**: Digite exatamente `frontend` (sem `/` no final)

5. Deixe os outros campos como estão:
   - **Build Command**: (vazio ou `npm run build`)
   - **Output Directory**: (vazio ou `dist`)
   - **Install Command**: (vazio ou `npm install`)

6. Clique em **Save**

---

## 3️⃣ Adicionar Environment Variable

1. Em **Settings** → **Environment Variables**
2. Clique em **Add New**
3. Preencha:
   - **Name**: `VITE_USE_STATIC_DATA`
   - **Value**: `true`
   - **Environments**: Marque todos (Production, Preview, Development)
4. Clique em **Save**

---

## 4️⃣ Fazer Redeploy

1. Vá em **Deployments** (no topo)
2. Clique nos **...** (três pontos) do último deploy
3. Clique em **Redeploy**
4. ⚠️ **DESMARQUE** "Use existing Build Cache"
5. Clique em **Redeploy**

---

## ✅ Verificar se Funcionou

Depois do deploy completar:

1. Abra o site deployado
2. Pressione **F12** para abrir o Console
3. Verifique se aparece: `📦 Usando dados estáticos (JSON)`
4. A tabela deve carregar com 3889 estabelecimentos

---

## 🐛 Troubleshooting

### ❌ Build falha com "cd: frontend: No such file or directory"

**Problema**: Root Directory não foi configurado

**Solução**: Volte ao passo 2️⃣ e configure `Root Directory: frontend`

---

### ❌ Build falha com erros de TypeScript

**Problema**: Cache antigo

**Solução**: Ao fazer Redeploy, **desmarque** "Use existing Build Cache"

---

### ❌ Site abre mas mostra 404

**Problema**: Output Directory errado

**Solução**:
1. Settings → General → Build & Development Settings
2. Output Directory deve estar `dist` (ou vazio)

---

### ❌ Site abre mas não carrega dados

**Problema**: `data.json` não está no build

**Solução**:
1. Veja os Build Logs do último deploy
2. Procure por `dist/data.json` (deve aparecer)
3. Se não aparecer, o arquivo `frontend/public/data.json` não existe
4. Execute localmente: `cd backend && npx tsx scripts/csv-to-json.ts`
5. Faça commit e push do arquivo gerado

---

### ❌ Console mostra "API não disponível"

**Problema**: Variável de ambiente não foi configurada

**Solução**: Volte ao passo 3️⃣ e adicione `VITE_USE_STATIC_DATA=true`

---

## 📝 Resumo da Configuração

```
Root Directory: frontend
VITE_USE_STATIC_DATA: true
```

Somente essas 2 configurações são necessárias!
