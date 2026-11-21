CREATE TABLE IF NOT EXISTS camera_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  kind TEXT NOT NULL CHECK (kind IN ('ANPR', 'CAMERA', 'UNKNOWN')),
  description TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS camera_reports_location_idx
  ON camera_reports USING GIST (location);

CREATE INDEX IF NOT EXISTS camera_reports_status_idx
  ON camera_reports (status);
