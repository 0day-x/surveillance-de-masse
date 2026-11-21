# Surveillance de masse

Open-source community map for public-interest ANPR and surveillance-camera reporting in France.

## Architecture

- `web/` — React, TypeScript and Leaflet
- `api/` — Node.js API backed by PostgreSQL/PostGIS
- Docker Compose for local development

## Principles

- OSM-compatible display, but reports remain in a moderated database
- No vehicle tracking or plate-image collection
- Public submissions require a location and optional source URL
- Admin moderation before a report becomes visible
- AGPL-3.0 licensed

## Local start

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env
docker compose up --build
```

Open http://localhost:5173.

## Submission rules

Only public-location observations and links to public, lawful sources may be submitted. Do not publish private residents’ names, faces, vehicle plates, or other personal data.
