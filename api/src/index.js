import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import pg from 'pg';
import { timingSafeEqual } from 'node:crypto';

const app = Fastify({ logger: true, bodyLimit: 16_384 });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await app.register(cors, { origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',') });
await app.register(rateLimit, { max: 30, timeWindow: '1 minute' });

app.get('/health', async (_request, reply) => {
  try { await pool.query('SELECT 1'); return { ok: true }; }
  catch { return reply.code(503).send({ ok: false }); }
});

app.get('/api/reports', async () => {
  const result = await pool.query(`
    SELECT id, latitude, longitude, kind, description, source_url, created_at
    FROM camera_reports WHERE status = 'approved'
    ORDER BY created_at DESC LIMIT 5000
  `);
  return { reports: result.rows };
});

app.post('/api/reports', async (request, reply) => {
  const body = request.body;
  if (!body || typeof body.latitude !== 'number' || !Number.isFinite(body.latitude) ||
      typeof body.longitude !== 'number' || !Number.isFinite(body.longitude)) {
    return reply.code(400).send({ error: 'Valid latitude and longitude are required.' });
  }
  if (body.latitude < -90 || body.latitude > 90 || body.longitude < -180 || body.longitude > 180) {
    return reply.code(400).send({ error: 'Coordinates are outside valid ranges.' });
  }
  if (body.description != null && typeof body.description !== 'string') {
    return reply.code(400).send({ error: 'Description must be text.' });
  }
  if (body.source_url != null && typeof body.source_url !== 'string') {
    return reply.code(400).send({ error: 'Source URL must be text.' });
  }

  const kind = ['ANPR', 'CAMERA', 'UNKNOWN'].includes(body.kind) ? body.kind : 'UNKNOWN';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 1000) || null : null;
  const sourceUrl = typeof body.source_url === 'string' ? body.source_url.trim() : '';
  if (sourceUrl && (sourceUrl.length > 2000 || !/^https?:\/\//i.test(sourceUrl))) {
    return reply.code(400).send({ error: 'Source link must be an HTTP or HTTPS URL under 2000 characters.' });
  }

  const result = await pool.query(`
    INSERT INTO camera_reports (latitude, longitude, kind, description, source_url)
    VALUES ($1, $2, $3, $4, $5) RETURNING id
  `, [body.latitude, body.longitude, kind, description, sourceUrl || null]);
  return reply.code(201).send({ id: result.rows[0].id, status: 'pending' });
});

function isAdmin(request) {
  const secret = process.env.ADMIN_TOKEN;
  const header = request.headers.authorization || '';
  if (!secret || !header.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

app.get('/api/admin/reports', async (request, reply) => {
  if (!process.env.ADMIN_TOKEN) return reply.code(503).send({ error: 'Admin access is not configured.' });
  if (!isAdmin(request)) return reply.code(401).send({ error: 'Unauthorized.' });
  const result = await pool.query(`
    SELECT id, latitude, longitude, kind, description, source_url, status, created_at
    FROM camera_reports WHERE status = 'pending' ORDER BY created_at ASC LIMIT 500
  `);
  return { reports: result.rows };
});

app.patch('/api/admin/reports/:id', async (request, reply) => {
  if (!process.env.ADMIN_TOKEN) return reply.code(503).send({ error: 'Admin access is not configured.' });
  if (!isAdmin(request)) return reply.code(401).send({ error: 'Unauthorized.' });
  const { id } = request.params;
  const { status } = request.body || {};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !['approved', 'rejected'].includes(status)) {
    return reply.code(400).send({ error: 'A valid report ID and approved/rejected status are required.' });
  }
  const result = await pool.query('UPDATE camera_reports SET status = $1 WHERE id = $2 RETURNING id', [status, id]);
  if (!result.rowCount) return reply.code(404).send({ error: 'Report not found.' });
  return { id, status };
});

app.addHook('onClose', async () => pool.end());
await app.listen({ port: Number(process.env.PORT || 3000), host: '0.0.0.0' });
