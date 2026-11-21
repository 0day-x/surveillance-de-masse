import Fastify from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';

const app = Fastify({ logger: true });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await app.register(cors, { origin: process.env.CORS_ORIGIN || true });

app.get('/health', async () => ({ ok: true }));

app.get('/api/reports', async () => {
  const result = await pool.query(`
    SELECT id, latitude, longitude, kind, description, source_url, created_at
    FROM camera_reports
    WHERE status = 'approved'
    ORDER BY created_at DESC
  `);
  return { reports: result.rows };
});

app.post('/api/reports', async (request, reply) => {
  const body = request.body;
  if (!body || typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
    return reply.code(400).send({ error: 'Valid latitude and longitude are required' });
  }
  if (body.latitude < -90 || body.latitude > 90 || body.longitude < -180 || body.longitude > 180) {
    return reply.code(400).send({ error: 'Coordinates are outside valid ranges' });
  }

  const kind = ['ANPR', 'CAMERA', 'UNKNOWN'].includes(body.kind) ? body.kind : 'UNKNOWN';
  const description = typeof body.description === 'string' ? body.description.slice(0, 1000) : null;
  const sourceUrl = typeof body.source_url === 'string' ? body.source_url.slice(0, 2000) : null;

  const result = await pool.query(`
    INSERT INTO camera_reports (latitude, longitude, kind, description, source_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [body.latitude, body.longitude, kind, description, sourceUrl]);

  return reply.code(201).send({ id: result.rows[0].id, status: 'pending' });
});

await app.listen({ port: Number(process.env.PORT || 3000), host: '0.0.0.0' });
