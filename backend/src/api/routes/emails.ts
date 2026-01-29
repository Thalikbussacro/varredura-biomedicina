import { Router } from 'express';
import { db } from '../../db/connection.js';
import { OpenAIService } from '../../services/openai.js';
import { GmailService } from '../../services/gmail.js';
import { emailBatchProcessor } from '../../services/emailBatchProcessor.js';
import type { GeneratedEmail, EmailConfig } from '../../types/email.js';

export const emailsRouter = Router();

const openaiService = new OpenAIService();
const gmailService = new GmailService();

emailBatchProcessor.setProcessCallback(async (job) => {
  const establishment = db.prepare(`
    SELECT
      e.id,
      e.name,
      e.category,
      c.name as city,
      c.uf,
      (SELECT value FROM contacts WHERE establishment_id = e.id AND type = 'email' LIMIT 1) as email
    FROM establishments e
    JOIN cities c ON e.city_id = c.id
    WHERE e.id = ?
  `).get(job.establishmentId) as any;

  if (!establishment || !establishment.email) {
    throw new Error('Estabelecimento não encontrado ou sem e-mail');
  }

  let generatedEmail = db.prepare(`
    SELECT * FROM generated_emails
    WHERE establishment_id = ? AND status = 'draft'
  `).get(establishment.id) as GeneratedEmail | undefined;

  if (!generatedEmail) {
    const emailContent = await openaiService.generateEmail({
      establishmentName: establishment.name,
      category: establishment.category,
      city: establishment.city,
      uf: establishment.uf,
    });

    const insertStmt = db.prepare(`
      INSERT INTO generated_emails (establishment_id, subject, body, recipient_email, status)
      VALUES (?, ?, ?, ?, 'draft')
    `);

    const result = insertStmt.run(
      establishment.id,
      emailContent.subject,
      emailContent.body,
      establishment.email
    );

    generatedEmail = db.prepare(`
      SELECT * FROM generated_emails WHERE id = ?
    `).get(result.lastInsertRowid) as GeneratedEmail;
  }

  const emailConfig = db.prepare(`
    SELECT * FROM email_config WHERE id = 1
  `).get() as EmailConfig | undefined;

  if (!emailConfig?.gmail_access_token || !emailConfig?.gmail_refresh_token) {
    throw new Error('Gmail não configurado');
  }

  await gmailService.sendEmail({
    to: generatedEmail.recipient_email,
    subject: generatedEmail.subject,
    body: generatedEmail.body,
    accessToken: emailConfig.gmail_access_token,
    refreshToken: emailConfig.gmail_refresh_token,
  });

  db.prepare(`
    UPDATE generated_emails
    SET status = 'sent', sent_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(generatedEmail.id);
});

/**
 * GET /api/emails/:establishmentId
 * Busca e-mail gerado para um estabelecimento
 */
emailsRouter.get('/:establishmentId', (req, res) => {
  try {
    const { establishmentId } = req.params;

    const email = db.prepare(`
      SELECT * FROM generated_emails
      WHERE establishment_id = ?
      ORDER BY generated_at DESC
      LIMIT 1
    `).get(establishmentId) as GeneratedEmail | undefined;

    if (!email) {
      return res.status(404).json({ error: 'E-mail não encontrado' });
    }

    res.json(email);
  } catch (error) {
    console.error('Erro ao buscar e-mail:', error);
    res.status(500).json({ error: 'Erro ao buscar e-mail' });
  }
});

/**
 * POST /api/emails/generate/:establishmentId
 * Gera um novo e-mail para um estabelecimento
 */
emailsRouter.post('/generate/:establishmentId', async (req, res) => {
  try {
    const { establishmentId } = req.params;

    const existingEmail = db.prepare(`
      SELECT * FROM generated_emails
      WHERE establishment_id = ? AND status = 'draft'
    `).get(establishmentId) as GeneratedEmail | undefined;

    if (existingEmail) {
      return res.json(existingEmail);
    }

    const establishment = db.prepare(`
      SELECT
        e.id,
        e.name,
        e.category,
        c.name as city,
        c.uf,
        (SELECT value FROM contacts WHERE establishment_id = e.id AND type = 'email' LIMIT 1) as email
      FROM establishments e
      JOIN cities c ON e.city_id = c.id
      WHERE e.id = ?
    `).get(establishmentId) as any;

    if (!establishment) {
      return res.status(404).json({ error: 'Estabelecimento não encontrado' });
    }

    if (!establishment.email) {
      return res.status(400).json({ error: 'Estabelecimento não possui e-mail' });
    }

    const emailContent = await openaiService.generateEmail({
      establishmentName: establishment.name,
      category: establishment.category,
      city: establishment.city,
      uf: establishment.uf,
    });

    const stmt = db.prepare(`
      INSERT INTO generated_emails (establishment_id, subject, body, recipient_email, status)
      VALUES (?, ?, ?, ?, 'draft')
    `);

    const result = stmt.run(
      establishment.id,
      emailContent.subject,
      emailContent.body,
      establishment.email
    );

    const generatedEmail = db.prepare(`
      SELECT * FROM generated_emails WHERE id = ?
    `).get(result.lastInsertRowid);

    res.json(generatedEmail);
  } catch (error) {
    console.error('Erro ao gerar e-mail:', error);
    res.status(500).json({ error: 'Erro ao gerar e-mail' });
  }
});

/**
 * DELETE /api/emails/:id
 * Deleta um e-mail draft
 */
emailsRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const email = db.prepare(`
      SELECT * FROM generated_emails WHERE id = ?
    `).get(id) as GeneratedEmail | undefined;

    if (!email) {
      return res.status(404).json({ error: 'E-mail não encontrado' });
    }

    if (email.status !== 'draft') {
      return res.status(400).json({ error: 'Apenas drafts podem ser deletados' });
    }

    db.prepare(`DELETE FROM generated_emails WHERE id = ?`).run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar e-mail:', error);
    res.status(500).json({ error: 'Erro ao deletar e-mail' });
  }
});

/**
 * POST /api/emails/send/:id
 * Envia um e-mail individual
 */
emailsRouter.post('/send/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const email = db.prepare(`
      SELECT * FROM generated_emails WHERE id = ?
    `).get(id) as GeneratedEmail | undefined;

    if (!email) {
      return res.status(404).json({ error: 'E-mail não encontrado' });
    }

    if (email.status !== 'draft') {
      return res.status(400).json({ error: 'Apenas drafts podem ser enviados' });
    }

    const emailConfig = db.prepare(`
      SELECT * FROM email_config WHERE id = 1
    `).get() as EmailConfig | undefined;

    if (!emailConfig?.gmail_access_token || !emailConfig?.gmail_refresh_token) {
      return res.status(400).json({ error: 'Gmail não configurado. Por favor, autentique primeiro.' });
    }

    await gmailService.sendEmail({
      to: email.recipient_email,
      subject: email.subject,
      body: email.body,
      accessToken: emailConfig.gmail_access_token,
      refreshToken: emailConfig.gmail_refresh_token,
    });

    db.prepare(`
      UPDATE generated_emails
      SET status = 'sent', sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    const updatedEmail = db.prepare(`
      SELECT * FROM generated_emails WHERE id = ?
    `).get(id);

    res.json(updatedEmail);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);

    db.prepare(`
      UPDATE generated_emails
      SET status = 'failed', error_message = ?
      WHERE id = ?
    `).run(error instanceof Error ? error.message : 'Erro desconhecido', id);

    res.status(500).json({ error: 'Erro ao enviar e-mail' });
  }
});

/**
 * POST /api/emails/send-batch
 * Inicia envio em massa
 */
emailsRouter.post('/send-batch', async (req, res) => {
  try {
    const { establishmentIds } = req.body as { establishmentIds: number[] };

    if (!Array.isArray(establishmentIds) || establishmentIds.length === 0) {
      return res.status(400).json({ error: 'IDs de estabelecimentos inválidos' });
    }

    const batchId = await emailBatchProcessor.createBatch(establishmentIds);

    res.json({ batchId });
  } catch (error) {
    console.error('Erro ao criar batch:', error);
    res.status(500).json({ error: 'Erro ao criar batch' });
  }
});

/**
 * GET /api/emails/batch-status/:batchId
 * Verifica status de um batch
 */
emailsRouter.get('/batch-status/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;

    const status = emailBatchProcessor.getBatchStatus(batchId);

    if (!status) {
      return res.status(404).json({ error: 'Batch não encontrado' });
    }

    res.json(status);
  } catch (error) {
    console.error('Erro ao buscar status do batch:', error);
    res.status(500).json({ error: 'Erro ao buscar status do batch' });
  }
});
