-- Tabela de cidades
CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uf TEXT NOT NULL,
    name TEXT NOT NULL,
    ibge_id INTEGER UNIQUE NOT NULL,
    population INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cities_uf ON cities(uf);
CREATE INDEX IF NOT EXISTS idx_cities_population ON cities(population);

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
    GROUP_CONCAT(CASE WHEN ct.type = 'linkedin' THEN ct.value END) AS linkedin
FROM establishments e
LEFT JOIN cities c ON e.city_id = c.id
LEFT JOIN contacts ct ON e.id = ct.establishment_id
GROUP BY e.id;
