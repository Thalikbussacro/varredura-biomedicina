import OpenAI from 'openai';
import type { EmailGenerationParams, GeneratedEmailContent } from '../types/email.js';
import type { EstablishmentValidationParams, ValidationResult } from '../types/validation.js';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada no .env');
    }
    this.client = new OpenAI({ apiKey });
  }

  async generateEmail(params: EmailGenerationParams): Promise<GeneratedEmailContent> {
    const prompt = `
      Gere um e-mail profissional personalizado para solicitar vaga de estágio.

      Contexto:
      - Candidata: Ketlin Tibes, formanda em Biomedicina pela UNOESC Joaçaba
      - Estabelecimento: ${params.establishmentName}
      - Área: ${this.getCategoryDescription(params.category)}
      - Localização: ${params.city}/${params.uf}

      Template base:
      Assunto: Deve ser direto e mencionar interesse em estágio

      Corpo:
      - Apresentar-se como Ketlin Tibes, formanda em Biomedicina pela UNOESC Joaçaba
      - Mencionar interesse na área de genética e embriologia 
      - Destacar disponibilidade para estágio não remunerado
      - Informar período de estágio: início no segundo semestre 2026, 30 horas semanais, com possibilidade de extensão
      - Ressaltar habilidades e competências relevantes para a área
      - Mencione que está fazendo cursos online na área para aprimorar conhecimentos e contrinuir no estágio
      - Demonstrar entusiasmo pela oportunidade de aprendizado e crescimento profissional
      - Dizer que está interessada em trabalhar "na empresa de vocês","com vocês", nunca cite o nome diretamente da empresa
      - Solicitar uma oportunidade de entrevista ou conversa para discutir a possibilidade de estágio
      - Mencionar contato: (49) 9997-7523
      - Agradecer pela atenção e colocar-se à disposição
      - Assinatura: Ketlin Tibes

      ##IMPORTANTE##
      - Sempre cheque todas as informações fornecidas no contexto para evitar ir e-mail dizendo o nome da empresa como "fale conosco" ou correlatos

      Instruções:
      1. Mantenha o tom profissional e pessoal
      2. Adapte o texto para a área específica do estabelecimento
      3. Mencione interesse específico na área de atuação
      4. NÃO pareça mensagem automática em massa
      5. Seja conciso e direto (máximo 3 parágrafos curtos)
      6. Retorne no formato JSON: { "subject": "...", "body": "..." }
      7. NO corpo do email, use quebras de linha apropriadas (\\n\\n entre parágrafos)
    `;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI retornou resposta vazia');
    }

    const parsed = JSON.parse(content) as GeneratedEmailContent;

    if (!parsed.subject || !parsed.body) {
      throw new Error('OpenAI retornou formato inválido');
    }

    return parsed;
  }

  async validateEstablishment(params: EstablishmentValidationParams): Promise<ValidationResult> {
    const prompt = `Analise o seguinte estabelecimento para determinar se é uma instalação biomédica real relevante para estágios em reprodução humana/embriologia.

ACEITAR:
- Clínicas/centros de reprodução assistida, FIV, fertilidade
- Laboratórios de genética/citogenética
- Laboratórios de análises clínicas com departamento de andrologia
- Centros de pesquisa em embriologia
- Clínicas de medicina reprodutiva

REJEITAR:
- Artigos de notícias ou jornalismo sobre reprodução
- Páginas "Fale conosco" ou landing pages genéricas
- Sites de vagas de emprego
- Artigos acadêmicos ou universidades (a menos que tenham labs clínicos)
- Ginecologia geral sem especialização em reprodução
- Hospitais genéricos sem departamento de reprodução
- Sites de informação/conteúdo sobre saúde reprodutiva

Dados do estabelecimento:
Nome: ${params.name}
Categoria: ${params.category}
Site: ${params.website || 'não disponível'}
Endereço: ${params.address || 'não disponível'}

Retorne JSON no formato:
{
  "isValid": true ou false,
  "reason": "explicação breve do motivo da decisão",
  "confidence": número entre 0.0 e 1.0 indicando confiança na decisão
}

IMPORTANTE: Se o nome contém palavras como "notícia", "jornal", "revista", "portal", "fale conosco", "contato", é MUITO provável que seja irrelevante.`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Mais determinístico para validação
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI retornou resposta vazia');
    }

    const parsed = JSON.parse(content) as ValidationResult;
    if (typeof parsed.isValid !== 'boolean' || !parsed.reason || typeof parsed.confidence !== 'number') {
      throw new Error('OpenAI retornou formato inválido');
    }

    return parsed;
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'reproducao_humana': 'Reprodução Humana',
      'reproducao_animal': 'Reprodução Animal',
      'laboratorio_analises': 'Laboratório de Análises Clínicas',
      'laboratorio_pesquisa': 'Laboratório de Pesquisa',
      'genetica': 'Genética',
      'banco_sangue': 'Banco de Sangue',
      'hemoterapia': 'Hemoterapia',
      'imagenologia': 'Imagenologia',
      'universidade': 'Universidade/Instituição de Ensino',
      'outros': 'Área da Saúde',
    };

    return descriptions[category] || category;
  }
}
