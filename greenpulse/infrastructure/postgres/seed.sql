-- =============================================================
-- GREENPULSE — Données de démo
-- =============================================================

-- Organisation de démonstration
INSERT INTO organizations (id, name, slug, plan, industry, size, country, green_reporting)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'TechCorp SAS',
    'techcorp',
    'enterprise',
    'software',
    'sme',
    'FR',
    true
);

-- Utilisateur admin
INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'admin@greenpulse.io',
    -- Mot de passe : Admin123! (bcrypt hash)
    '$2b$12$aT/vFQkpiePNkDPgCKDLF.TA21RnXZxfatm.73NG5/in2OdHr3aZ6',
    'Alice',
    'Martin',
    'admin'
);

-- Utilisateur standard
INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'user@greenpulse.io',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeWLtbpelrN/5.5Na',
    'Bob',
    'Dupont',
    'user'
);

-- Projet de démonstration
INSERT INTO projects (id, organization_id, name, description, url, environment, tags, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Application principale',
    'Notre SaaS B2B principal en production',
    'https://app.techcorp.io',
    'production',
    ARRAY['saas', 'b2b', 'critical'],
    '00000000-0000-0000-0000-000000000002'
);

-- Audit de démonstration (complété)
INSERT INTO audits (
    id, project_id, organization_id, initiated_by,
    name, status,
    scan_categories,
    started_at, completed_at,
    score_global, score_frontend, score_backend, score_database,
    score_infra, score_ai, score_network, score_energy, score_co2,
    co2_grams_estimated, energy_kwh_estimated, cloud_cost_usd_monthly,
    duration_ms
) VALUES (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Audit initial mai 2025',
    'completed',
    ARRAY['frontend','backend','database','infrastructure','ai_usage','network']::scan_category[],
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '4 minutes',
    72,   -- score global
    85,   -- frontend
    68,   -- backend
    61,   -- database
    48,   -- infra
    79,   -- ai
    74,   -- network
    63,   -- energy
    70,   -- co2
    1248.5,   -- co2 grams
    3.42,     -- kwh
    847.00,   -- USD/month cloud
    245000    -- 4min 5s
);

-- Quelques findings de démonstration
INSERT INTO findings (audit_id, category, severity, title, description, impact, affected_resource, co2_impact_grams, energy_impact_kwh)
VALUES
(
    '00000000-0000-0000-0000-000000000020',
    'frontend',
    'high',
    '23 images non optimisées en WebP',
    'Les images JPEG/PNG représentent 68% du poids total de la page (4.2MB). Aucune image n''est servie en format WebP ou AVIF.',
    'Réduction estimée de 18% de la bande passante et du CO₂ de transfert',
    'https://app.techcorp.io/',
    142.3,
    0.038
),
(
    '00000000-0000-0000-0000-000000000020',
    'frontend',
    'medium',
    'JavaScript inutilisé : 342KB',
    'tree-shaking insuffisant, 342KB de JavaScript non utilisé chargé sur la page principale.',
    'Ralentissement du First Input Delay, consommation inutile de CPU côté client',
    'https://app.techcorp.io/bundle.js',
    28.1,
    0.008
),
(
    '00000000-0000-0000-0000-000000000020',
    'backend',
    'critical',
    'Endpoint /api/users appelé 847 fois/min sans cache',
    'L''endpoint GET /api/users ne possède aucun cache. Il est appelé 847 fois par minute, générant des requêtes SQL redondantes.',
    'Consommation CPU x4 inutile, 847 req/min = ~1.2M requêtes SQL/jour évitables',
    'GET /api/users',
    384.2,
    0.105
),
(
    '00000000-0000-0000-0000-000000000020',
    'database',
    'high',
    'Table "sessions" avec 8.4M lignes non purgées',
    'La table sessions contient 8.4M de lignes dont 94% sont expirées. Aucun job de purge automatique.',
    'Requêtes ralenties, index bloat, consommation disque inutile (12GB)',
    'table: sessions',
    0,
    0.019
),
(
    '00000000-0000-0000-0000-000000000020',
    'infrastructure',
    'critical',
    '3 instances EC2 utilisées à moins de 5%',
    'Trois serveurs m5.xlarge tournent 24/7 avec une utilisation CPU < 5% en moyenne. Surprovisionnement estimé à 78%.',
    'Coût cloud inutile : ~$420/mois. Émissions CO₂ : ~89kg/mois évitables.',
    'AWS EC2: i-0a1b2c3d4e5f, i-0f1e2d3c4b5a, i-0123456789ab',
    89000,
    0
),
(
    '00000000-0000-0000-0000-000000000020',
    'ai_usage',
    'medium',
    'Appels GPT-4 sans cache : 2400/jour',
    'Le système effectue 2400 appels à GPT-4 par jour sans aucun mécanisme de cache. 65% des prompts sont identiques ou très similaires.',
    'Coût IA inutile : ~$180/mois. CO₂ IA : ~312g CO₂eq/jour évitables.',
    'OpenAI API: /v1/chat/completions',
    312,
    0.089
),
(
    '00000000-0000-0000-0000-000000000020',
    'network',
    'medium',
    'Payloads API non compressés',
    '87% des réponses API ne sont pas compressées (gzip/brotli). Taille moyenne des réponses : 48KB.',
    'Consommation bande passante 5-10x supérieure au nécessaire',
    'API Gateway',
    67.4,
    0.018
);

-- Recommandations IA
INSERT INTO ai_recommendations (audit_id, priority, category, title, description, impact_description, effort, co2_reduction_grams, energy_saving_kwh, cost_saving_usd_monthly, action_steps)
VALUES
(
    '00000000-0000-0000-0000-000000000020',
    'critical',
    'infrastructure',
    'Rightsizing des instances EC2',
    'Réduire les 3 instances m5.xlarge en m5.small ou t3.medium selon charge réelle',
    'Économie de 89kg CO₂/mois et $420/mois',
    'low',
    89000,
    245.0,
    420.00,
    '["Analyser les métriques CloudWatch sur 30 jours", "Identifier le type d''instance optimal", "Planifier une migration en heures creuses", "Configurer des Auto Scaling Groups"]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000020',
    'critical',
    'backend',
    'Implémenter le cache Redis sur /api/users',
    'Mettre en cache la réponse de l''endpoint /api/users (TTL 60s)',
    'Réduction de 847 req/min en BD, économie de 384g CO₂/mois',
    'low',
    384,
    0.105,
    12.00,
    '["Installer ioredis dans le backend", "Décorer le handler avec @UseInterceptors(CacheInterceptor)", "Définir un TTL de 60 secondes", "Ajouter une invalidation sur mutation"]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000020',
    'high',
    'frontend',
    'Convertir toutes les images en WebP',
    'Configurer le pipeline de build pour convertir automatiquement les images en WebP avec sharp',
    'Réduction de 18% de la bande passante frontend',
    'low',
    142,
    0.038,
    8.00,
    '["npm install --save-dev sharp", "Créer un script de conversion batch", "Configurer vite-plugin-imagemin", "Ajouter les attributs loading=lazy sur les images"]'::jsonb
);

-- Métriques historiques (30 derniers jours simulés)
INSERT INTO metrics_history (organization_id, project_id, metric_name, metric_value, unit, recorded_at)
SELECT
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'audit_score_global',
    55 + (random() * 30)::int,
    'score',
    NOW() - (i || ' days')::INTERVAL
FROM generate_series(1, 30) AS i;

INSERT INTO metrics_history (organization_id, project_id, metric_name, metric_value, unit, recorded_at)
SELECT
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'co2_grams_daily',
    800 + (random() * 600)::int,
    'gco2',
    NOW() - (i || ' days')::INTERVAL
FROM generate_series(1, 30) AS i;

INSERT INTO metrics_history (organization_id, project_id, metric_name, metric_value, unit, recorded_at)
SELECT
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'energy_kwh_daily',
    2.1 + (random() * 1.8),
    'kwh',
    NOW() - (i || ' days')::INTERVAL
FROM generate_series(1, 30) AS i;
