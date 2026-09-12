// PostgreSQL Relational Schema & Permissions for Supabase

export const SUPABASE_FIX_PERMISSIONS_SQL = `-- ==============================================================================
-- Quick 1-Click Fix for PostgreSQL 42501 (Permission Denied) in Supabase
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Ensure RLS policies allow anon & authenticated read/write
DROP POLICY IF EXISTS "Allow all on laboratories" ON laboratories;
CREATE POLICY "Allow all on laboratories" ON laboratories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on users" ON users;
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on instruments" ON instruments;
CREATE POLICY "Allow all on instruments" ON instruments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on equipment" ON equipment;
CREATE POLICY "Allow all on equipment" ON equipment FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on test_sessions" ON test_sessions;
CREATE POLICY "Allow all on test_sessions" ON test_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on reports" ON reports;
CREATE POLICY "Allow all on reports" ON reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on attachments" ON attachments;
CREATE POLICY "Allow all on attachments" ON attachments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on audit_logs" ON audit_logs;
CREATE POLICY "Allow all on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Relax strict foreign key constraints to allow asynchronous, out-of-order client sync
ALTER TABLE IF EXISTS instruments DROP CONSTRAINT IF EXISTS instruments_laboratory_id_fkey;
ALTER TABLE IF EXISTS equipment DROP CONSTRAINT IF EXISTS equipment_laboratory_id_fkey;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_laboratory_id_fkey;
ALTER TABLE IF EXISTS test_sessions DROP CONSTRAINT IF EXISTS test_sessions_laboratory_id_fkey;
ALTER TABLE IF EXISTS test_sessions DROP CONSTRAINT IF EXISTS test_sessions_technician_id_fkey;
ALTER TABLE IF EXISTS test_sessions DROP CONSTRAINT IF EXISTS test_sessions_reviewer_id_fkey;
ALTER TABLE IF EXISTS test_sessions DROP CONSTRAINT IF EXISTS test_sessions_instrument_id_fkey;
ALTER TABLE IF EXISTS reports DROP CONSTRAINT IF EXISTS reports_test_session_id_fkey;
ALTER TABLE IF EXISTS reports DROP CONSTRAINT IF EXISTS reports_instrument_id_fkey;
ALTER TABLE IF EXISTS reports DROP CONSTRAINT IF EXISTS reports_laboratory_id_fkey;
`;

export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- OIML R 76 Non-Automatic Weighing Instruments (NAWI)
-- Supabase PostgreSQL Relational Schema & Storage Setup
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. LABORATORIES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS laboratories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  accreditation_number TEXT NOT NULL,
  accreditation_body TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  logo_url TEXT,
  full_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. USERS / OPERATORS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'LAB_TECHNICIAN', 'REVIEWER_OFFICER')),
  designation TEXT NOT NULL,
  laboratory_id TEXT REFERENCES laboratories(id) ON DELETE SET NULL,
  laboratory_name TEXT,
  avatar_url TEXT,
  signature_text TEXT,
  full_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. INSTRUMENTS (NAWI Under Test)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS instruments (
  id TEXT PRIMARY KEY,
  instrument_id_tag TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  instrument_type TEXT NOT NULL,
  accuracy_class TEXT NOT NULL CHECK (accuracy_class IN ('CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII')),
  max_capacity NUMERIC NOT NULL,
  min_capacity NUMERIC NOT NULL,
  verification_scale_interval NUMERIC NOT NULL,
  actual_scale_interval NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  number_of_intervals INTEGER NOT NULL,
  tare_type TEXT,
  max_tare NUMERIC,
  additive_tare NUMERIC,
  load_receptor_type TEXT NOT NULL,
  number_of_support_points INTEGER NOT NULL DEFAULT 4,
  platform_dimensions TEXT,
  software_version TEXT NOT NULL,
  power_supply TEXT NOT NULL,
  operating_temperature_min NUMERIC NOT NULL,
  operating_temperature_max NUMERIC NOT NULL,
  pattern_approval_number TEXT,
  marking_details TEXT,
  notes TEXT,
  laboratory_id TEXT REFERENCES laboratories(id) ON DELETE SET NULL,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  full_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instruments_tag ON instruments(instrument_id_tag);
CREATE INDEX IF NOT EXISTS idx_instruments_accuracy_class ON instruments(accuracy_class);
CREATE INDEX IF NOT EXISTS idx_instruments_serial ON instruments(serial_number);
CREATE INDEX IF NOT EXISTS idx_instruments_laboratory_id ON instruments(laboratory_id);

-- ==============================================================================
-- 5. TEST EQUIPMENT / REFERENCE STANDARDS (OIML Weights, Sensors)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  equipment_id_tag TEXT NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  weight_class TEXT,
  nominal_range TEXT NOT NULL,
  uncertainty TEXT,
  calibration_certificate_number TEXT NOT NULL,
  calibrated_by TEXT NOT NULL,
  calibration_date DATE NOT NULL,
  calibration_expiry_date DATE NOT NULL,
  is_expired BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  laboratory_id TEXT REFERENCES laboratories(id) ON DELETE SET NULL,
  full_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_tag ON equipment(equipment_id_tag);
CREATE INDEX IF NOT EXISTS idx_equipment_expiry ON equipment(calibration_expiry_date);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);

-- ==============================================================================
-- 6. TEST SESSIONS (OIML Verification Workflows)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS test_sessions (
  id TEXT PRIMARY KEY,
  test_session_number TEXT NOT NULL UNIQUE,
  instrument_id TEXT NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
  laboratory_id TEXT REFERENCES laboratories(id) ON DELETE SET NULL,
  technician_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  technician_name TEXT NOT NULL,
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  standard_edition TEXT NOT NULL DEFAULT 'OIML R 76-1:2006',
  rule_set_version TEXT NOT NULL DEFAULT 'OIML-R76-2006-v1.0',
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REPORT_GENERATED')),
  verification_type TEXT NOT NULL DEFAULT 'INITIAL',
  is_demo_data BOOLEAN NOT NULL DEFAULT FALSE,
  overall_compliance TEXT NOT NULL DEFAULT 'NOT_EVALUATED' CHECK (overall_compliance IN ('PASS', 'FAIL', 'NOT_EVALUATED')),
  compliance_summary JSONB,
  reviewer_comments TEXT,
  rejection_reason TEXT,
  test_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  environmental_readings JSONB NOT NULL DEFAULT '[]'::jsonb,
  weighing_observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  repeatability_series JSONB NOT NULL DEFAULT '[]'::jsonb,
  eccentricity_observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  zero_setting_observation JSONB,
  tare_observation JSONB,
  temperature_span_observation JSONB,
  discrimination_observation JSONB,
  tilting_observation JSONB,
  attachment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  instrument_snapshot JSONB NOT NULL,
  full_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_sessions_number ON test_sessions(test_session_number);
CREATE INDEX IF NOT EXISTS idx_test_sessions_instrument ON test_sessions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_compliance ON test_sessions(overall_compliance);
CREATE INDEX IF NOT EXISTS idx_test_sessions_technician ON test_sessions(technician_id);

-- ==============================================================================
-- 7. TEST REPORTS & VERIFICATION CERTIFICATES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  report_number TEXT NOT NULL UNIQUE,
  current_revision INTEGER NOT NULL DEFAULT 1,
  test_session_id TEXT NOT NULL REFERENCES test_sessions(id) ON DELETE RESTRICT,
  instrument_id TEXT NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
  laboratory_id TEXT REFERENCES laboratories(id) ON DELETE SET NULL,
  standard_edition TEXT NOT NULL DEFAULT 'OIML R 76-1:2006',
  rule_set_version TEXT NOT NULL DEFAULT 'OIML-R76-2006-v1.0',
  is_demo_data BOOLEAN NOT NULL DEFAULT FALSE,
  overall_compliance TEXT NOT NULL CHECK (overall_compliance IN ('PASS', 'FAIL', 'NOT_EVALUATED')),
  compliance_reason TEXT,
  compliance_statement TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  technician_signed_at TIMESTAMPTZ,
  reviewer_name TEXT NOT NULL,
  reviewer_signed_at TIMESTAMPTZ,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  sha256_integrity_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  instrument_snapshot JSONB NOT NULL,
  test_session_snapshot JSONB NOT NULL,
  equipment_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  compliance_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
  revisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  full_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_number ON reports(report_number);
CREATE INDEX IF NOT EXISTS idx_reports_test_session ON reports(test_session_id);
CREATE INDEX IF NOT EXISTS idx_reports_instrument ON reports(instrument_id);
CREATE INDEX IF NOT EXISTS idx_reports_hash ON reports(sha256_integrity_hash);

-- ==============================================================================
-- 8. ATTACHMENTS (Photos, Nameplates, Test Certificates)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT,
  public_url TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL CHECK (category IN ('NAMEPLATE_PHOTO', 'SEAL_PHOTO', 'DEFECT_PHOTO', 'CALIBRATION_CERT', 'MANUAL', 'OTHER')),
  associated_entity TEXT NOT NULL CHECK (associated_entity IN ('INSTRUMENT', 'TEST_SESSION', 'REPORT', 'EQUIPMENT')),
  associated_entity_id TEXT NOT NULL,
  full_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(associated_entity, associated_entity_id);

-- ==============================================================================
-- 9. AUDIT LOGS (Immutable Chronological Audit Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ==============================================================================
-- 10. TABLE PRIVILEGES & PERMISSIONS (Fix for PostgreSQL Error 42501)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on laboratories" ON laboratories;
CREATE POLICY "Allow all on laboratories" ON laboratories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on users" ON users;
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on instruments" ON instruments;
CREATE POLICY "Allow all on instruments" ON instruments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on equipment" ON equipment;
CREATE POLICY "Allow all on equipment" ON equipment FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on test_sessions" ON test_sessions;
CREATE POLICY "Allow all on test_sessions" ON test_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on reports" ON reports;
CREATE POLICY "Allow all on reports" ON reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on attachments" ON attachments;
CREATE POLICY "Allow all on attachments" ON attachments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on audit_logs" ON audit_logs;
CREATE POLICY "Allow all on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 12. SUPABASE STORAGE BUCKET
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('nawi-attachments', 'nawi-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public access to nawi-attachments" ON storage.objects;
CREATE POLICY "Allow public access to nawi-attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'nawi-attachments');

DROP POLICY IF EXISTS "Allow upload to nawi-attachments" ON storage.objects;
CREATE POLICY "Allow upload to nawi-attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nawi-attachments');

DROP POLICY IF EXISTS "Allow update on nawi-attachments" ON storage.objects;
CREATE POLICY "Allow update on nawi-attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'nawi-attachments');
`;
