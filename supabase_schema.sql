-- ================================================================
-- CyclingDirector — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── TEAMS ────────────────────────────────────────────────────────
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  created_by  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RIDERS ───────────────────────────────────────────────────────
CREATE TABLE riders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id      UUID REFERENCES teams(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  birth_date   DATE,
  weight_kg    NUMERIC(5,2),
  ftp_watts    INTEGER,
  fc_max       INTEGER,
  category     TEXT,
  wkg          NUMERIC(4,2),
  is_pro       BOOLEAN DEFAULT FALSE,
  is_active    BOOLEAN DEFAULT TRUE,
  notes             TEXT,
  registration_date DATE DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── RIDER METRICS HISTORY ────────────────────────────────────────
CREATE TABLE rider_metrics_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rider_id     UUID REFERENCES riders(id) ON DELETE CASCADE,
  team_id      UUID REFERENCES teams(id) ON DELETE CASCADE,
  recorded_at       TIMESTAMPTZ DEFAULT NOW(),
  measurement_date  DATE DEFAULT CURRENT_DATE,
  weight_kg         NUMERIC(5,2),
  ftp_watts         INTEGER,
  fc_max            INTEGER,
  wkg               NUMERIC(4,2)
);

-- ── RACES ────────────────────────────────────────────────────────
CREATE TABLE races (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  date        DATE,
  venue       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RACE SESSIONS (one row per rider per race) ───────────────────
CREATE TABLE race_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id          UUID REFERENCES races(id) ON DELETE CASCADE,
  rider_id         UUID REFERENCES riders(id) ON DELETE SET NULL,
  rider_name       TEXT NOT NULL,  -- denormalized for resilience
  file_name        TEXT,
  -- computed metrics
  np_watts         INTEGER,
  if_score         NUMERIC(4,2),
  tss              INTEGER,
  dist_km          NUMERIC(6,2),
  duration_min     NUMERIC(6,1),
  avg_fc           INTEGER,
  max_fc_obs       INTEGER,
  pct_fcmax        INTEGER,
  avg_fc_pct       INTEGER,
  avg_speed        NUMERIC(5,2),
  max_speed        NUMERIC(5,2),
  max_power        INTEGER,
  avg_power_active INTEGER,
  efficiency       NUMERIC(5,2),
  -- JSON blobs for nested data
  peaks            JSONB,   -- {p5s, p30s, p1m, p5m, p20m}
  fc_zones         JSONB,   -- [z1, z2, z3, z4, z5] percentages
  pw_zones         JSONB,   -- [z1..z6] percentages
  timeseries       JSONB,   -- [{min, pow, fc, spd}, ...]
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── AI ANALYSES ──────────────────────────────────────────────────
CREATE TABLE ai_analyses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id    UUID REFERENCES races(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  model      TEXT DEFAULT 'claude-opus-4-5',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RACE FILES (Supabase Storage references) ─────────────────────
CREATE TABLE race_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id       UUID REFERENCES races(id) ON DELETE CASCADE,
  rider_id      UUID REFERENCES riders(id) ON DELETE SET NULL,
  storage_path  TEXT,  -- path in Supabase Storage bucket
  original_name TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ROW LEVEL SECURITY
-- Every user can only see/edit rows belonging to their team
-- ================================================================

ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE races         ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_files    ENABLE ROW LEVEL SECURITY;

-- Teams: owner only
CREATE POLICY "teams_owner" ON teams
  FOR ALL USING (created_by = auth.uid());

-- Helper: get user's team_id
CREATE OR REPLACE FUNCTION my_team_id()
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT id FROM teams WHERE created_by = auth.uid() LIMIT 1;
$$;

-- Riders: belong to my team
CREATE POLICY "riders_team" ON riders
  FOR ALL USING (team_id = my_team_id());

-- Rider History: belong to my team
CREATE POLICY "history_team" ON rider_metrics_history
  FOR ALL USING (team_id = my_team_id());

-- Races: belong to my team
CREATE POLICY "races_team" ON races
  FOR ALL USING (team_id = my_team_id());

-- Sessions: via race
CREATE POLICY "sessions_team" ON race_sessions
  FOR ALL USING (
    race_id IN (SELECT id FROM races WHERE team_id = my_team_id())
  );

-- AI analyses: via race
CREATE POLICY "ai_team" ON ai_analyses
  FOR ALL USING (
    race_id IN (SELECT id FROM races WHERE team_id = my_team_id())
  );

-- Files: via race
CREATE POLICY "files_team" ON race_files
  FOR ALL USING (
    race_id IN (SELECT id FROM races WHERE team_id = my_team_id())
  );

-- ================================================================
-- INDEXES for performance
-- ================================================================
CREATE INDEX idx_riders_team    ON riders(team_id);
CREATE INDEX idx_history_rider  ON rider_metrics_history(rider_id);
CREATE INDEX idx_history_date   ON rider_metrics_history(recorded_at DESC);
CREATE INDEX idx_races_team     ON races(team_id);
CREATE INDEX idx_races_date     ON races(date DESC);
CREATE INDEX idx_sessions_race  ON race_sessions(race_id);
CREATE INDEX idx_sessions_rider ON race_sessions(rider_id);
CREATE INDEX idx_ai_race        ON ai_analyses(race_id);
CREATE INDEX idx_ai_created     ON ai_analyses(created_at DESC);

-- ================================================================
-- STORAGE BUCKET
-- Run separately in Storage section or via this SQL:
-- ================================================================
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('race-files', 'race-files', false);
