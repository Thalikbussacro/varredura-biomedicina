import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ler CSV
const csvPath = path.join(__dirname, '../../leads-biomedica-sul.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV (separado por ponto e vírgula)
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].replace(/^\uFEFF/, '').split(';'); // Remove BOM

const data = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];

  // Parse CSV com suporte a campos entre aspas
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ';' && !insideQuotes) {
      values.push(currentValue.replace(/^"|"$/g, '').trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Adicionar último valor
  if (currentValue) {
    values.push(currentValue.replace(/^"|"$/g, '').trim());
  }

  // Criar objeto
  const row: any = {};
  headers.forEach((header, index) => {
    const key = header.trim();
    const value = values[index] || '';

    // Mapear para os nomes que o frontend espera
    if (key === 'ID') row.id = parseInt(value) || 0;
    else if (key === 'Estado') row.estado = value;
    else if (key === 'Cidade') row.cidade = value;
    else if (key === 'Nome') row.nome = value;
    else if (key === 'Categoria') row.categoria = value;
    else if (key === 'Site') row.site = value || null;
    else if (key === 'Telefones') row.telefones = value || null;
    else if (key === 'Emails') row.emails = value || null;
    else if (key === 'WhatsApp') row.whatsapp = value || null;
    else if (key === 'Instagram') row.instagram = value || null;
    else if (key === 'Facebook') row.facebook = value || null;
    else if (key === 'LinkedIn') row.linkedin = value || null;
  });

  data.push(row);
}

// Salvar JSON no frontend
const outputPath = path.join(__dirname, '../../frontend/public/data.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`✅ Convertido ${data.length} estabelecimentos para JSON`);
console.log(`📁 Salvo em: ${outputPath}`);
console.log(`📊 Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
