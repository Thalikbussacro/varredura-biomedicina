# Deploy na Vercel

## Opção 1: Configurar via Dashboard (Recomendada)

1. Acesse seu projeto na Vercel Dashboard
2. Vá em **Settings** → **General**
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. Vá em **Settings** → **Environment Variables** e adicione:
   - Key: `VITE_USE_STATIC_DATA`
   - Value: `true`

5. Faça **Redeploy** do projeto

---

## Opção 2: Usando vercel.json (já está configurado)

Já existe um `vercel.json` na raiz do projeto. Basta fazer commit e push:

```bash
git add vercel.json frontend/public/data.json
git commit -m "feat: adicionar configuracao da vercel e dados estaticos"
git push
```

A Vercel vai automaticamente detectar e fazer redeploy.

---

## Verificação

Depois do deploy, verifique:

1. Abra o Console do navegador (F12)
2. Procure pela mensagem: `📦 Usando dados estáticos (JSON)`
3. Veja se os dados carregam corretamente

---

## Troubleshooting

### Erro 404 ao carregar /data.json

Se ainda der 404, verifique:

1. Na Vercel Dashboard → **Deployments** → Clique no último deploy
2. Vá em **Build Logs**
3. Procure por `dist/data.json` nos logs de build
4. Se não aparecer, o arquivo não está sendo copiado

**Solução**: O arquivo deve estar em `frontend/public/data.json` antes do build.

### Dados não carregam

Abra o DevTools (F12) → Console e veja qual erro aparece.

Se aparecer CORS ou erro de rede, está tentando buscar da API (fallback falhou).
