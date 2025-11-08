-- DFBTR-23: Automatic Version Creation on Edit

CREATE TABLE IF NOT EXISTS qa_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qa_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  question TEXT,
  answer TEXT,
  tags TEXT,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_versions_unique 
  ON qa_versions(qa_id, version_number);

-- Trigger: before updating qa table
CREATE TRIGGER IF NOT EXISTS trg_qa_before_update
BEFORE UPDATE ON qa
FOR EACH ROW
BEGIN
  INSERT INTO qa_versions (qa_id, version_number, question, answer, tags, status, created_at, created_by)
  SELECT 
    OLD.id,
    COALESCE((SELECT MAX(version_number) FROM qa_versions WHERE qa_id = OLD.id), 0) + 1,
    OLD.question,
    OLD.answer,
    OLD.tags,
    OLD.status,
    datetime('now'),
    OLD.updated_by;
END;
