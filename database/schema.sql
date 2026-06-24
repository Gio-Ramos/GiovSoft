CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  service TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  status_label TEXT NOT NULL DEFAULT 'Nueva',
  email_status TEXT NOT NULL DEFAULT 'pending',
  email_status_detail TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_status
  ON contact_requests (status);

CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at
  ON contact_requests (created_at DESC);

CREATE TABLE IF NOT EXISTS contact_request_notes (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES contact_requests (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  status_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_request_notes_request_id
  ON contact_request_notes (request_id);

CREATE TABLE IF NOT EXISTS contact_request_status_history (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES contact_requests (id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  label TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_request_status_history_request_id
  ON contact_request_status_history (request_id);
