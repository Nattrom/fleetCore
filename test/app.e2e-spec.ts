import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';

describe('FleetCore API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let managerToken: string;

  beforeAll(async () => {
    if (process.env.DB_NAME !== 'fleetcore_test') {
      throw new Error(
        'E2E tests require the isolated fleetcore_test database; set DB_NAME=fleetcore_test',
      );
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const server = app.getHttpServer();
    const adminLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'admin@fleetcore.local', password: 'FleetCoreAdmin!2026' })
      .expect(201);
    adminToken = adminLogin.body.data.accessToken as string;

    const managerLogin = await request(server)
      .post('/auth/login')
      .send({
        email: 'manager@fleetcore.local',
        password: 'FleetCoreManager!2026',
      })
      .expect(201);
    managerToken = managerLogin.body.data.accessToken as string;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves public health and protects business endpoints by default', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          success: true,
          statusCode: 200,
          data: { status: 'ok' },
        });
      });

    await request(app.getHttpServer())
      .get('/vehicles')
      .expect(401)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.path).toBe('/vehicles');
      });
  });

  it('registers a non-admin user, hashes the password, and issues a JWT', async () => {
    const email = `e2e-${randomUUID()}@fleetcore.test`;
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E Technician', email, password: 'test-password-2026' })
      .expect(201);

    expect(registration.body.data.role).toBe('TECHNICIAN');
    expect(registration.body.data).not.toHaveProperty('passwordHash');

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'test-password-2026' })
      .expect(201);
    const token = login.body.data.accessToken as string;

    await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.email).toBe(email);
        expect(body.data.role).toBe('TECHNICIAN');
      });
  });

  it('rejects invalid credentials and disallows administrative writes to managers', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@fleetcore.local', password: 'incorrect-password' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        plate: 'E2E0001',
        brand: 'Test',
        model: 'Truck',
        year: 2024,
        mileage: 0,
      })
      .expect(403);
  });

  it('validates API keys independently of JWT authentication', async () => {
    const missingVehicleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await request(app.getHttpServer())
      .get(`/integrations/vehicles/${missingVehicleId}/maintenance-history`)
      .expect(401);

    await request(app.getHttpServer())
      .get(`/integrations/vehicles/${missingVehicleId}/maintenance-history`)
      .set('x-api-key', 'invalid-key')
      .expect(401);

    await request(app.getHttpServer())
      .get(`/integrations/vehicles/${missingVehicleId}/maintenance-history`)
      .set('x-api-key', 'demo-key-partner-1')
      .expect(404);
  });

  it('isolates technician access to assigned maintenance', async () => {
    const techLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'tech1@fleetcore.local', password: 'FleetCoreTech!2026' })
      .expect(201);
    const token = techLogin.body.data.accessToken as string;

    await request(app.getHttpServer())
      .get('/maintenances/a2222222-2222-4222-8222-222222222222')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('completes maintenance atomically and updates vehicle mileage and availability', async () => {
    const maintenanceId = 'a3333333-3333-4333-8333-333333333333';
    const vehicleId = 'FLEET002';

    const vehicle = await request(app.getHttpServer())
      .get(`/vehicles/plate/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const initialMileage = vehicle.body.data.mileage as number;

    await request(app.getHttpServer())
      .patch(`/maintenances/${maintenanceId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/maintenances/${maintenanceId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        workPerformed: 'E2E inspection completed',
        cost: '250.00',
        finishedAt: new Date().toISOString(),
        finalMileage: initialMileage + 100,
      })
      .expect(200);

    const updatedVehicle = await request(app.getHttpServer())
      .get(`/vehicles/plate/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(updatedVehicle.body.data.status).toBe('AVAILABLE');
    expect(updatedVehicle.body.data.mileage).toBe(initialMileage + 100);
  });

  it('rate limits repeated authentication attempts from one client', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `unknown-${attempt}@fleetcore.test`,
          password: 'incorrect-password',
        });
      statuses.push(response.status);
    }

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });
});
