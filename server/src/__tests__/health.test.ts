import request from 'supertest';
import { createApp } from '../app';

describe('Health Check API', () => {
  const app = createApp();

  it('GET /api/v1/health should return status 200 and operational info', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('VaultIQ API is running');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.service).toBe('VaultIQ Core API');
    expect(res.body.data.status).toBe('operational');
  });

  it('GET /api/v1/non-existent-route should return 404', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
