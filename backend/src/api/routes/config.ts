import { Router } from 'express';
import { db } from '../../db/connection.js';
import { GmailService } from '../../services/gmail.js';

export const configRouter = Router();
const gmailService = new GmailService();

/**
 * GET /api/config/status
 * Retorna status das configurações (OpenAI + Gmail)
 */
configRouter.get('/status', (req, res) => {
  try {
    const openaiConfigured = !!process.env.OPENAI_API_KEY;
    const gmailClientConfigured = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);

    const emailConfig = db.prepare(`
      SELECT user_email, gmail_token_expiry FROM email_config WHERE id = 1
    `).get() as { user_email: string | null; gmail_token_expiry: string | null } | undefined;

    const gmailAuthenticated = !!(emailConfig?.user_email && emailConfig?.gmail_token_expiry);

    res.json({
      openai: {
        configured: openaiConfigured,
      },
      gmail: {
        clientConfigured: gmailClientConfigured,
        authenticated: gmailAuthenticated,
        userEmail: emailConfig?.user_email || null,
        tokenExpiry: emailConfig?.gmail_token_expiry || null,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar status de configuração:', error);
    res.status(500).json({ error: 'Erro ao buscar status de configuração' });
  }
});

/**
 * POST /api/config/gmail/auth
 * Inicia o fluxo OAuth do Gmail
 */
configRouter.post('/gmail/auth', (req, res) => {
  try {
    const authUrl = gmailService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Erro ao gerar URL de autenticação:', error);
    res.status(500).json({ error: 'Erro ao gerar URL de autenticação' });
  }
});

/**
 * GET /api/config/gmail/callback
 * Callback OAuth do Google
 */
configRouter.get('/gmail/callback', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código de autorização não fornecido' });
  }

  try {
    const tokens = await gmailService.handleCallback(code);

    const stmt = db.prepare(`
      INSERT INTO email_config (id, gmail_refresh_token, gmail_access_token, gmail_token_expiry, user_email, updated_at)
      VALUES (1, ?, ?, datetime(?, 'unixepoch', 'localtime'), 'me', CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        gmail_refresh_token = excluded.gmail_refresh_token,
        gmail_access_token = excluded.gmail_access_token,
        gmail_token_expiry = excluded.gmail_token_expiry,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(tokens.refresh_token, tokens.access_token, Math.floor(tokens.expiry_date / 1000));

    res.send(`
      <html>
        <body>
          <h1>✅ Autenticação concluída com sucesso!</h1>
          <p>Você já pode fechar esta janela e voltar para o aplicativo.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Erro ao processar callback do Gmail:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>❌ Erro na autenticação</h1>
          <p>Ocorreu um erro ao processar a autenticação. Por favor, tente novamente.</p>
          <p>Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        </body>
      </html>
    `);
  }
});
