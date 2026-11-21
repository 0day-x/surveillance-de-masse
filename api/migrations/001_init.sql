CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS camera_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  location GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  kind TEXT NOT NULL CHECK (kind IN ('ANPR', 'CAMERA', 'UNKNOWN')),
  description TEXT CHECK (char_length(description) <= 1000),
  source_url TEXT CHECK (char_length(source_url) <= 2000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS camera_reports_location_idx ON camera_reports USING GIST (location);
CREATE INDEX IF NOT EXISTS camera_reports_status_created_idx ON camera_reports (status, created_at DESC);
