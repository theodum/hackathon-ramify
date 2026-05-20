-- =============================================================
-- GREENPULSE — Migration 001 : Initial schema
-- PostgreSQL 16
-- Idempotent: uses IF NOT EXISTS everywhere
-- =============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =============================================================
-- TYPES ÉNUMÉRÉS (only create if they don't exist)
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user', 'viewer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_status') THEN
    CREATE TYPE audit_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scan_category') THEN
    CREATE TYPE scan_category AS ENUM ('frontend', 'backend', 'database', 'infrastructure', 'ai_usage', 'network');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity') THEN
    CREATE TYPE severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_format') THEN
    CREATE TYPE report_format AS ENUM ('pdf', 'json', 'csv', 'html');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_priority') THEN
    CREATE TYPE recommendation_priority AS ENUM ('critical', 'high', 'medium', 'low');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'effort_level') THEN
    CREATE TYPE effort_level AS ENUM ('low', 'medium', 'high');
  END IF;
END
$$;

-- =============================================================
-- ORGANISATIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    plan            VARCHAR(50) DEFAULT 'starter',
    logo_url        TEXT,
    industry        VARCHAR(100),
    size            VARCHAR(50),
    country         VARCHAR(10) DEFAULT 'FR',
    reen_reporting  BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- UTILISATEURS
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    role            user_role DEFAULT 'user',
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org   ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================
-- REFRESH TOKENS
-- =============================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- =============================================================
-- PROJETS
-- =============================================================

CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    url             TEXT,
    environment     VARCHAR(50),
    tags            TEXT[],
    is_active       BOOLEAN DEFAULT true,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);

-- =============================================================
-- AUDITS
-- =============================================================

CREATE TABLE IF NOT EXISTS audits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    initiated_by    UUID REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    status          audit_status DEFAULT 'pending',
    scan_categories scan_category[],
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    error_message   TEXT,
    score_global    SMALLINT,
    score_frontend  SMALLINT,
    score_backend   SMALLINT,
    score_database  SMALLINT,
    score_infra     SMALLINT,
    score_ai        SMALLINT,
    score_network   SMALLINT,
    score_energy    SMALLINT,
    score_co2       SMALLINT,
    co2_grams_estimated     NUMERIC(12,4),
    energy_kwh_estimated    NUMERIC(12,6),
    cloud_cost_usd_monthly  NUMERIC(10,2),
    lighthouse_version      VARCHAR(20),
    duration_ms             INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audits_project ON audits(project_id);
CREATE INDEX IF NOT EXISTS idx_audits_org     ON audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_audits_status  ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_created ON audits(created_at DESC);

-- =============================================================
-- RÉSULTATS DE SCAN
-- =============================================================

CREATE TABLE IF NOT EXISTS scan_results (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id    UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    category    scan_category NOT NULL,
    score       SMALLINT,
    status      VARCHAR(20) DEFAULT 'completed',
    duration_ms INTEGER,
    raw_data    JSONB,
    summary     TEXT,
    started_at  TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scan_results_audit    ON scan_results(audit_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_category ON scan_results(category);

-- =============================================================
-- FINDINGS
-- =============================================================

CREATE TABLE IF NOT EXISTS findings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id        UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    scan_result_id  UUID REFERENCES scan_results(id) ON DELETE CASCADE,
    category        scan_category NOT NULL,
    severity        severity NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    impact          TEXT,
    affected_resource VARCHAR(500),
    evidence        JSONB,
    remediation     TEXT,
    co2_impact_grams  NUMERIC(10,4),
    energy_impact_kwh NUMERIC(10,6),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_audit    ON findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_category ON findings(category);

-- =============================================================
-- RECOMMANDATIONS IA
-- =============================================================

CREATE TABLE IF NOT EXISTS ai_recommendations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id        UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    priority        recommendation_priority NOT NULL,
    category        scan_category,
    title           VARCHAR(500) NOT NULL,
    description     TEXT NOT NULL,
    impact_description TEXT,
    effort          effort_level DEFAULT 'medium',
    co2_reduction_grams     NUMERIC(10,4),
    energy_saving_kwh       NUMERIC(10,6),
    cost_saving_usd_monthly NUMERIC(10,2),
    action_steps    JSONB,
    affected_findings UUID[],
    is_applied      BOOLEAN DEFAULT false,
    applied_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reco_audit     ON ai_recommendations(audit_id);
CREATE INDEX IF NOT EXISTS idx_ai_reco_priority  ON ai_recommendations(priority);

-- =============================================================
-- RAPPORTS
-- =============================================================

CREATE TABLE IF NOT EXISTS reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id        UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    generated_by    UUID REFERENCES users(id),
    format          report_format NOT NULL,
    file_path       TEXT,
    file_size_bytes INTEGER,
    download_count  INTEGER DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_audit ON reports(audit_id);
CREATE INDEX IF NOT EXISTS idx_reports_org   ON reports(organization_id);

-- =============================================================
-- MÉTRIQUES HISTORIQUES
-- =============================================================

CREATE TABLE IF NOT EXISTS metrics_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    metric_name     VARCHAR(100) NOT NULL,
    metric_value    NUMERIC(15,6) NOT NULL,
    unit            VARCHAR(50),
    tags            JSONB,
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_org     ON metrics_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_metrics_project ON metrics_history(project_id);
CREATE INDEX IF NOT EXISTS idx_metrics_name    ON metrics_history(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_time    ON metrics_history(recorded_at DESC);

-- =============================================================
-- ALERTES
-- =============================================================

CREATE TABLE IF NOT EXISTS alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    audit_id        UUID REFERENCES audits(id) ON DELETE SET NULL,
    severity        severity NOT NULL,
    title           VARCHAR(500) NOT NULL,
    message         TEXT,
    metric_name     VARCHAR(100),
    threshold       NUMERIC(15,6),
    current_value   NUMERIC(15,6),
    is_resolved     BOOLEAN DEFAULT false,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_org      ON alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(is_resolved, created_at DESC);

-- =============================================================
-- CHECKLIST REEN
-- =============================================================

CREATE TABLE IF NOT EXISTS reen_checklists (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id    UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    article_ref VARCHAR(50) NOT NULL,
    title       VARCHAR(500) NOT NULL,
    description TEXT,
    is_compliant BOOLEAN,
    evidence    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reen_audit ON reen_checklists(audit_id);

-- =============================================================
-- AUDIT LOGS
-- =============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    org_id      UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(100),
    resource_id UUID,
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(created_at DESC);

-- =============================================================
-- FONCTION updated_at (CREATE OR REPLACE — always safe)
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers (drop first to avoid duplicate errors)
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- VUES UTILITAIRES (CREATE OR REPLACE — always safe)
-- =============================================================

CREATE OR REPLACE VIEW v_audit_summary AS
SELECT
    o.id AS org_id,
    o.name AS org_name,
    COUNT(a.id) AS total_audits,
    AVG(a.score_global) AS avg_score_global,
    SUM(a.co2_grams_estimated) AS total_co2_grams,
    SUM(a.energy_kwh_estimated) AS total_energy_kwh,
    MAX(a.created_at) AS last_audit_at
FROM organizations o
LEFT JOIN audits a ON a.organization_id = o.id AND a.status = 'completed'
GROUP BY o.id, o.name;

CREATE OR REPLACE VIEW v_critical_findings AS
SELECT
    f.*,
    a.project_id,
    p.name AS project_name
FROM findings f
JOIN audits a ON a.id = f.audit_id
JOIN projects p ON p.id = a.project_id
WHERE f.severity IN ('critical', 'high')
ORDER BY f.created_at DESC;
