-- ============================================
--  DSA Tracker — Supabase Database Setup
-- ============================================
--  Run this SQL in your Supabase project:
--    Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================

-- 1. Create the tasks table
CREATE TABLE IF NOT EXISTS tasks (
    task_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_title   TEXT NOT NULL CHECK (char_length(task_title) > 0),
    task_description TEXT DEFAULT '',
    topic        TEXT NOT NULL DEFAULT 'Arrays',
    priority     TEXT NOT NULL DEFAULT 'Medium'
                     CHECK (priority IN ('Hard', 'Medium', 'Easy')),
    due_date     DATE,
    status       TEXT NOT NULL DEFAULT 'Pending'
                     CHECK (status IN ('Completed', 'Pending')),
    solution_code TEXT DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If table already exists, add the solution_code column:
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS solution_code TEXT DEFAULT '';

-- 2. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_topic   ON tasks(user_id, topic);

-- 3. Enable Row-Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — each user can only access their own tasks
CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Auto-update `updated_at` on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
