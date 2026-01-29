import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import type { SendEmailParams, TokenData } from '../types/email.js';

export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/api/config/gmail/callback';

    if (!clientId || !clientSecret) {
      throw new Error('GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET devem estar configurados no .env');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.send'],
      prompt: 'consent',
    });
  }

  async handleCallback(code: string): Promise<TokenData> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      token_type: tokens.token_type!,
      expiry_date: tokens.expiry_date!,
    };
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    this.oauth2Client.setCredentials({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    // Codifica o assunto usando RFC 2047 (Base64) para suportar acentos
    const encodedSubject = `=?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`;

    const message = [
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `To: ${params.to}`,
      `Subject: ${encodedSubject}`,
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

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiryDate: number }> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      expiryDate: credentials.expiry_date!,
    };
  }
}
