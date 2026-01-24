import axios from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { db } from '../db/connection.js';
import { delay } from '../utils/delay.js';
import { CONFIG } from '../config/index.js';

// Regex patterns para extração de contatos
const PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-.\s]?\d{4}/g,
  whatsapp: /(?:wa\.me|api\.whatsapp\.com\/send\?phone=)[\d\/]+/gi,
  instagram: /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/gi,
  facebook: /facebook\.com\/([a-zA-Z0-9_.]+)/gi,
  linkedin: /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/gi,
};

interface ExtractedContacts {
  emails: string[];
  phones: string[];
  whatsapp: string[];
  instagram: string[];
  facebook: string[];
  linkedin: string[];
}

interface Establishment {
  id: number;
  website: string;
}

/**
 * Extrai contatos de uma URL
 */
async function extractContactsFromUrl(url: string): Promise<ExtractedContacts> {
  const contacts: ExtractedContacts = {
    emails: [],
    phones: [],
    whatsapp: [],
    instagram: [],
    facebook: [],
    linkedin: [],
  };

  try {
    const { data: html } = await axios.get(url, {
      timeout: CONFIG.CRAWL_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      maxRedirects: 3,
    });

    const $ = cheerio.load(html);

    // Remover scripts e styles
    $('script, style, noscript').remove();

    const text = $('body').text();
    const allHrefs = $('a').map((_, el) => $(el).attr('href')).get().join(' ');
    const fullText = `${text} ${allHrefs}`;

    // Extrair emails
    const emails = fullText.match(PATTERNS.email) || [];
    contacts.emails = [...new Set(emails)]
      .filter(e => !e.includes('example') && !e.includes('sentry') && !e.includes('@w3.org'));

    // Extrair telefones
    const phones = fullText.match(PATTERNS.phone) || [];
    contacts.phones = [...new Set(phones)]
      .map(p => p.replace(/\D/g, ''))
      .filter(p => p.length >= 10 && p.length <= 13);

    // Extrair WhatsApp
    const whatsapp = fullText.match(PATTERNS.whatsapp) || [];
    contacts.whatsapp = [...new Set(whatsapp)];

    // Extrair Instagram
    const instagram = fullText.match(PATTERNS.instagram) || [];
    contacts.instagram = [...new Set(instagram)];

    // Extrair Facebook
    const facebook = fullText.match(PATTERNS.facebook) || [];
    contacts.facebook = [...new Set(facebook)];

    // Extrair LinkedIn
    const linkedin = fullText.match(PATTERNS.linkedin) || [];
    contacts.linkedin = [...new Set(linkedin)];

    // Tentar encontrar página de contato
    const contactLinks = $('a').filter((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      return /contato|contact|fale.?conosco/i.test(href) ||
             /contato|contact|fale conosco/i.test(text);
    });

    if (contactLinks.length > 0) {
      const contactHref = $(contactLinks[0]).attr('href');
      if (contactHref && !contactHref.startsWith('mailto:')) {
        try {
          const contactUrl = new URL(contactHref, url).href;
          if (contactUrl !== url) {
            await delay(300);
            const extraContacts = await extractContactsFromUrl(contactUrl);

            // Merge contacts
            contacts.emails.push(...extraContacts.emails);
            contacts.phones.push(...extraContacts.phones);
            contacts.whatsapp.push(...extraContacts.whatsapp);
            contacts.instagram.push(...extraContacts.instagram);
            contacts.facebook.push(...extraContacts.facebook);
            contacts.linkedin.push(...extraContacts.linkedin);
          }
        } catch {
          // Silently fail on contact page
        }
      }
    }

  } catch {
    // Silently fail - muitos sites não respondem
  }

  // Deduplicate all
  return {
    emails: [...new Set(contacts.emails)],
    phones: [...new Set(contacts.phones)],
    whatsapp: [...new Set(contacts.whatsapp)],
    instagram: [...new Set(contacts.instagram)],
    facebook: [...new Set(contacts.facebook)],
    linkedin: [...new Set(contacts.linkedin)],
  };
}

/**
 * Enriquece estabelecimentos com informações de contato
 */
export async function enrichEstablishments(): Promise<void> {
  console.log('🌐 Iniciando enriquecimento via crawling...');

  const establishments = db.prepare(`
    SELECT e.id, e.website
    FROM establishments e
    LEFT JOIN contacts c ON e.id = c.establishment_id
    WHERE e.website IS NOT NULL
      AND e.website != ''
      AND c.id IS NULL
  `).all() as Establishment[];

  console.log(`  📋 ${establishments.length} sites para processar\n`);

  const limit = pLimit(CONFIG.CONCURRENT_CRAWLS);

  const stmtInsertContact = db.prepare(`
    INSERT OR IGNORE INTO contacts (establishment_id, type, value)
    VALUES (?, ?, ?)
  `);

  let processed = 0;
  let withContacts = 0;

  const tasks = establishments.map(est =>
    limit(async () => {
      await delay(500);

      const contacts = await extractContactsFromUrl(est.website);

      let hasContact = false;

      // Inserir contatos
      for (const email of contacts.emails.slice(0, 3)) {
        stmtInsertContact.run(est.id, 'email', email);
        hasContact = true;
      }

      for (const phone of contacts.phones.slice(0, 3)) {
        stmtInsertContact.run(est.id, 'phone', phone);
        hasContact = true;
      }

      for (const wa of contacts.whatsapp.slice(0, 2)) {
        stmtInsertContact.run(est.id, 'whatsapp', wa);
        hasContact = true;
      }

      for (const ig of contacts.instagram.slice(0, 2)) {
        stmtInsertContact.run(est.id, 'instagram', ig);
        hasContact = true;
      }

      for (const fb of contacts.facebook.slice(0, 2)) {
        stmtInsertContact.run(est.id, 'facebook', fb);
        hasContact = true;
      }

      for (const li of contacts.linkedin.slice(0, 2)) {
        stmtInsertContact.run(est.id, 'linkedin', li);
        hasContact = true;
      }

      processed++;
      if (hasContact) withContacts++;

      process.stdout.write(`\r  🌐 Processados: ${processed}/${establishments.length} | Com contatos: ${withContacts}`);
    })
  );

  await Promise.all(tasks);

  console.log(`\n  ✅ Enriquecimento finalizado\n`);
}
