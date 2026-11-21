# Surveillance de masse

Open-source community map for documenting public reports of surveillance infrastructure in France.

## Run locally

Requirements: Docker and Docker Compose.

```sh
git clone https://github.com/0day-x/surveillance-de-masse.git
cd surveillance-de-masse
docker compose up --build
```

Open <http://localhost:5173>. Click the map to select a location, complete the form, and submit. Reports are stored as **pending** and do not appear publicly until approved.

## Moderation setup

Set a long, unique admin token before deployment. For local Docker Compose, export it in your shell before starting the services:

```sh
export ADMIN_TOKEN="$(openssl rand -hex 32)"
docker compose up --build
```

Select **Modération** in the interface, enter the token, and load pending submissions. Keep the token secret; never commit it or share it with contributors. Use HTTPS in production. The API provides authenticated endpoints for listing pending reports and approving/rejecting them.

## Stack

- React, TypeScript, Vite, Leaflet
- Fastify API, PostgreSQL and PostGIS
- OpenStreetMap tile layer with attribution

## Privacy and contribution rules

The project stores only submitted location, category, description, optional public-source URL, moderation status, and submission time. It does not collect plate images or vehicle movements. Do not submit faces, license plates, private addresses, names, or other personal data. Do not trespass or interfere with equipment. Reports remain private to moderators until approved.

The default database credentials in Compose are for local development only. Replace them and configure HTTPS, backups, and secret management before deployment. The public OSM tile service has a usage policy; choose a compliant tile provider for substantial production traffic.

## License

AGPL-3.0. See [LICENSE](LICENSE).
