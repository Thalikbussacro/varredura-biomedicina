-- Tabela de cidades
CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uf TEXT NOT NULL,
    name TEXT NOT NULL,
    ibge_id INTEGER UNIQUE NOT NULL,
    population INTEGER,
    lat REAL,
    lng REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cities_uf ON cities(uf);
CREATE INDEX IF NOT EXISTS idx_cities_population ON cities(population);
CREATE INDEX IF NOT EXISTS idx_cities_coords ON cities(lat, lng);

-- Tabela de estabelecimentos
CREATE TABLE IF NOT EXISTS establishments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_normalized TEXT NOT NULL,
    city_id INTEGER REFERENCES cities(id),
    category TEXT NOT NULL,
    address TEXT,
    lat REAL,
    lng REAL,
    website TEXT,
    source TEXT NOT NULL,
    source_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_establishments_city ON establishments(city_id);
CREATE INDEX IF NOT EXISTS idx_establishments_category ON establishments(category);
CREATE INDEX IF NOT EXISTS idx_establishments_name_normalized ON establishments(name_normalized);

-- Tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    establishment_id INTEGER REFERENCES establishments(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- phone, email, whatsapp, instagram, facebook, linkedin, website
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(establishment_id, type, value)
);

CREATE INDEX IF NOT EXISTS idx_contacts_establishment ON contacts(establishment_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);

-- Log de buscas realizadas
CREATE TABLE IF NOT EXISTS search_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id INTEGER REFERENCES cities(id),
    keyword TEXT NOT NULL,
    source TEXT NOT NULL, -- serper, redlara, manual
    results_count INTEGER DEFAULT 0,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_log_city ON search_log(city_id);

-- Log de resultados rejeitados
CREATE TABLE IF NOT EXISTS rejected_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    reason TEXT NOT NULL, -- 'domain_blacklist', 'url_pattern', 'pdf', 'news', 'academic', 'generic_title', 'irrelevant'
    city_id INTEGER REFERENCES cities(id),
    keyword TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rejected_reason ON rejected_results(reason);

-- View para exportação
CREATE VIEW IF NOT EXISTS v_establishments_export AS
SELECT
    e.id,
    c.uf AS estado,
    c.name AS cidade,
    e.name AS nome,
    e.category AS categoria,
    e.address AS endereco,
    e.website AS site,
    e.source AS fonte,
    GROUP_CONCAT(CASE WHEN ct.type = 'phone' THEN ct.value END) AS telefones,
    GROUP_CONCAT(CASE WHEN ct.type = 'email' THEN ct.value END) AS emails,
    GROUP_CONCAT(CASE WHEN ct.type = 'whatsapp' THEN ct.value END) AS whatsapp,
    GROUP_CONCAT(CASE WHEN ct.type = 'instagram' THEN ct.value END) AS instagram,
    GROUP_CONCAT(CASE WHEN ct.type = 'facebook' THEN ct.value END) AS facebook,
    GROUP_CONCAT(CASE WHEN ct.type = 'linkedin' THEN ct.value END) AS linkedin,
    CAST(HAVERSINE(c.lat, c.lng, -27.1721, -51.5108) AS INTEGER) AS distancia_km
FROM establishments e
LEFT JOIN cities c ON e.city_id = c.id
LEFT JOIN contacts ct ON e.id = ct.establishment_id
GROUP BY e.id;

-- Tabela de emails gerados por IA
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
    UNIQUE(establishment_id, status)
);

CREATE INDEX IF NOT EXISTS idx_generated_emails_establishment ON generated_emails(establishment_id);
CREATE INDEX IF NOT EXISTS idx_generated_emails_status ON generated_emails(status);

-- Tabela de configuração de email (singleton)
CREATE TABLE IF NOT EXISTS email_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    gmail_refresh_token TEXT,
    gmail_access_token TEXT,
    gmail_token_expiry DATETIME,
    user_email TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
