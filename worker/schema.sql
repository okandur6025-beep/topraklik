CREATE TABLE IF NOT EXISTS news (id TEXT PRIMARY KEY, title TEXT NOT NULL, source TEXT, url TEXT NOT NULL, published_at TEXT NOT NULL, category TEXT NOT NULL, summary TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS news_pub ON news (published_at DESC);
CREATE INDEX IF NOT EXISTS news_cat ON news (category, published_at DESC);
CREATE TABLE IF NOT EXISTS notices (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, url TEXT, active INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS pages (section TEXT NOT NULL, slug TEXT NOT NULL, title TEXT NOT NULL, h1 TEXT, description TEXT NOT NULL, answer TEXT, body_html TEXT NOT NULL, faq_json TEXT NOT NULL DEFAULT '[]', sources_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'published', sort INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, PRIMARY KEY (section, slug));
CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, job TEXT NOT NULL, log TEXT);
INSERT INTO notices (text, url, sort) VALUES ('Topraklık yayında: icra ve hazine ihaleleri, 3B parsel sorgu, değerleme ve tarım rehberi tek yerde.', '/', 10);
INSERT INTO notices (text, url, sort) VALUES ('Yeni: Tarım haberleri her 2 saatte bir güncelleniyor.', '/haberler', 9);
INSERT INTO notices (text, url, sort) VALUES ('İcra ihalesine nasıl girilir? Adım adım rehberimiz yayında.', '/rehber/icra-ihalesine-nasil-girilir', 8);
