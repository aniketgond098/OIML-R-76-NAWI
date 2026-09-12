# Supabase PostgreSQL & IndexedDB Hybrid Architecture

## Overview
This Non-Automatic Weighing Instruments (NAWI) application employs an **offline-first, resilient hybrid data architecture**:

```
[User Input / Test Observations]
              │
              ▼
    [Application State]
              │
              ▼
[IndexedDB Local Safety Layer]  ◄── Immediate zero-latency local durability
              │
              ▼
      [Sync Engine Queue]      ◄── Durable FIFO queue in IndexedDB
              │
              ▼
[Supabase Cloud PostgreSQL]    ◄── Primary source of truth across all devices
```

---

## Storage Components

### 1. Supabase PostgreSQL (Cloud Database)
- **Primary Source of Truth**: When connected, all records are synchronized into cloud PostgreSQL tables.
- **Relational Integrity**: Foreign keys connect `test_sessions`, `instruments`, `equipment`, `laboratories`, `reports`, and `audit_logs`.
- **Blob / File Storage**: Photos, calibration certificates, and attachments are uploaded to Supabase Storage bucket `nawi-attachments`.
- **Row Level Security (RLS)**: Protects all tables with role and access policies.

### 2. IndexedDB (Local Resilience & Safety Layer)
- **Instant Local Durability**: Every observation, turning point measurement ($\Delta L$), zero test, tare setting, or instrument modification is saved to browser IndexedDB before or concurrently with network calls.
- **Offline Tolerance**: If an inspector or technician enters a factory or testing cellar with zero internet connectivity, the application operates with 100% functionality.
- **Sync Queue**: All mutation actions (`CREATE`, `UPDATE`, `DELETE`) are captured in the durable `syncQueue` IndexedDB store with UUIDs and idempotency keys.
- **Automatic Reconnection Sync**: When network connectivity returns, `SyncEngine` processes pending items in FIFO order, executes idempotent upserts against Supabase, and updates status indicators.

### 3. Deprecated localStorage
- Operational metrology data, instruments, observations, and reports are **no longer stored in localStorage**.
- A migration service automatically migrates legacy `oiml_nawi_*` localStorage records to IndexedDB upon startup and sets `storageSchemaVersion: 2`.

---

## Database Tables in PostgreSQL (`supabase/schema.sql`)

| Table Name | Description | Key Indexes / Constraints |
|---|---|---|
| `laboratories` | Accreditations, legal address, contact | `id PRIMARY KEY` |
| `users` | Technicians, Reviewer Officers, Admins | `id PRIMARY KEY`, `email UNIQUE` |
| `instruments` | Full metrological characteristics ($Max, Min, e, d, Class$) | `id PRIMARY KEY`, `accuracy_class`, `instrument_id_tag` |
| `equipment` | Reference standard weights ($E_1, E_2, F_1, F_2, M_1$) and sensors | `id PRIMARY KEY`, `calibration_expiry_date`, `status` |
| `test_sessions` | Verification test workflow state, raw observations, test plan | `id PRIMARY KEY`, `instrument_id FK`, `status` |
| `reports` | Digitally sealed verification certificates with SHA-256 integrity hash | `id PRIMARY KEY`, `report_number UNIQUE`, `test_session_id FK` |
| `attachments` | Photos of nameplates, metrology seals, defect logs | `id PRIMARY KEY`, `(associated_entity, associated_entity_id)` |
| `audit_logs` | Immutable audit trail with old/new diffs | `id PRIMARY KEY`, `timestamp DESC`, `entity_type` |

---

## Supabase Setup Instructions

1. **Create Supabase Project**:
   Sign in to [supabase.com](https://supabase.com) and create a new project.

2. **Execute SQL Schema**:
   Open the **SQL Editor** in your Supabase dashboard and run the entire contents of `/supabase/schema.sql`.

3. **Configure Environment Variables**:
   In `.env` or project settings:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Verify Storage Bucket**:
   Confirm that the `nawi-attachments` bucket was created in Supabase Storage with public access enabled for download.
