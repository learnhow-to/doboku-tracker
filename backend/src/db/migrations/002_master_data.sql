-- DobokuTracker 002: Master Data Schema
-- Manage workers and equipment masters per organization tenant

CREATE TABLE IF NOT EXISTS master_workers (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '自社',
    trade TEXT NOT NULL,
    default_work_hours NUMERIC(4,2) DEFAULT 8.0,
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_equipment (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code_number VARCHAR(50),
    category VARCHAR(50) DEFAULT 'heavy_machinery',
    vendor TEXT NOT NULL DEFAULT '自社',
    unit VARCHAR(20) DEFAULT '台',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_workers_org ON master_workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_master_equip_org ON master_equipment(organization_id);
