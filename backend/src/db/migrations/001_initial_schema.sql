-- DobokuTracker Initial Relational Schema
-- PostgreSQL compatible, enforce referential integrity, tenant isolation, and auditability

CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY,
    name TEXT NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    auth_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_memberships (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('worker', 'foreman', 'office', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code VARCHAR(50) NOT NULL,
    location TEXT,
    main_contractor TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS project_memberships (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('worker', 'foreman', 'office', 'admin')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS daily_reports (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    weather VARCHAR(50) NOT NULL,
    reporter_id VARCHAR(36) NOT NULL REFERENCES users(id),
    reporter_name TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED')),
    version INT NOT NULL DEFAULT 1,
    site_start_time VARCHAR(10),
    site_end_time VARCHAR(10),
    break_minutes INT DEFAULT 60,
    handover_notes TEXT,
    rejection_reason TEXT,
    approved_by VARCHAR(36) REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, work_date, reporter_id)
);

CREATE TABLE IF NOT EXISTS report_revisions (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    snapshot_json JSONB NOT NULL,
    changed_by VARCHAR(36) NOT NULL REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, revision_number)
);

CREATE TABLE IF NOT EXISTS report_workers (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '自社',
    trade TEXT NOT NULL,
    work_hours NUMERIC(4,2) NOT NULL DEFAULT 8.0,
    overtime_hours NUMERIC(4,2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_items (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    work_type TEXT NOT NULL,
    description TEXT NOT NULL,
    location_sta TEXT,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    calculation_details JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment_entries (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    vendor TEXT NOT NULL DEFAULT '自社',
    quantity NUMERIC(8,2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT '台',
    operating_hours NUMERIC(4,2),
    diesel_liters NUMERIC(8,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_entries (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    vendor TEXT NOT NULL DEFAULT '自社',
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    is_purchased BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ky_records (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    meeting_time VARCHAR(10),
    attendees_count INT NOT NULL DEFAULT 0,
    specific_hazards TEXT NOT NULL,
    countermeasures TEXT NOT NULL,
    supervisor_name TEXT NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS photos (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    stage VARCHAR(20) NOT NULL CHECK (stage IN ('before', 'during', 'after', 'other')),
    location_sta TEXT,
    work_type TEXT,
    caption TEXT,
    uploaded_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id VARCHAR(36) REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_operations (
    id VARCHAR(36) PRIMARY KEY,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    operation_name VARCHAR(100) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PROCESSED',
    response_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_org_proj ON daily_reports(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON daily_reports(work_date);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_events(organization_id);
