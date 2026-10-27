import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { UserRole } from '../src/common/enums/index.js';
import { User } from '../src/users/entities/user.entity.js';

describe('FleetCore API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let technicianToken: string;
  let technicianId: string;

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

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@fleetcore.local', password: 'FleetCoreAdmin!2026' })
      .expect(201);
    adminToken = adminLogin.body.data.accessToken as string;
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
        expect(body.statusCode).toBe(401);
        expect(body.path).toBe('/vehicles');
      });
  });

  it('registers a technician with a bcrypt hash and returns a JWT', async () => {
    const email = `e2e-${randomUUID()}@fleetcore.test`;
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E Technician', email, password: 'test-password-2026' })
      .expect(201);

    expect(registration.body.statusCode).toBe(201);
    expect(registration.body.data.role).toBe(UserRole.TECHNICIAN);
    expect(registration.body.data).not.toHaveProperty('password');
    expect(registration.body.data).not.toHaveProperty('passwordHash');
    technicianId = registration.body.data.id as string;

    const users = app.get<Repository<User>>(getRepositoryToken(User));
    const savedUser = await users.findOne({ where: { id: technicianId } });
    expect(savedUser?.passwordHash.startsWith('$2')).toBe(true);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'test-password-2026' })
      .expect(201);
    technicianToken = login.body.data.accessToken as string;

    await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.email).toBe(email);
        expect(body.data.role).toBe(UserRole.TECHNICIAN);
        expect(body.data).not.toHaveProperty('passwordHash');
      });
  });

  it('preserves the migrated legacy account as an inactive technician', async () => {
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    const migratedUser = await users.findOne({
      where: { email: 'manager@fleetcore.local' },
    });

    expect(migratedUser).toMatchObject({
      role: UserRole.TECHNICIAN,
      isActive: false,
    });
  });

  it('upgrades a seeded legacy password to bcrypt during login', async () => {
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    const admin = await users.findOne({
      where: { email: 'admin@fleetcore.local' },
    });

    expect(admin?.passwordHash.startsWith('$2')).toBe(true);
  });

  it('rejects invalid credentials, privilege escalation and unsupported roles', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@fleetcore.local', password: 'incorrect-password' })
      .expect(401)
      .expect(({ body }) => expect(body.statusCode).toBe(401));

    const vehiclePayload = () => ({
      plate: `E2E${randomUUID().replaceAll('-', '').slice(0, 5)}`,
      brand: 'Test',
      model: 'Truck',
      year: 2024,
      mileage: 0,
    });

    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${technicianToken}`)
      .send(vehiclePayload())
      .expect(403)
      .expect(({ body }) => expect(body.statusCode).toBe(403));

    const forgedToken = await app
      .get(JwtService)
      .signAsync({ sub: technicianId, role: UserRole.ADMIN });
    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${forgedToken}`)
      .send(vehiclePayload())
      .expect(403);

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Unsupported Role',
        email: `unsupported-${randomUUID()}@fleetcore.test`,
        password: 'test-password-2026',
        role: 'MANAGER',
      })
      .expect(400)
      .expect(({ body }) => expect(body.statusCode).toBe(400));
  });

  it('allows administrators to create resources with numeric HTTP response codes', async () => {
    const response = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plate: `E2E${randomUUID().replaceAll('-', '').slice(0, 5)}`,
        brand: 'Test',
        model: 'Truck',
        year: 2024,
        mileage: 0,
      })
      .expect(201);

    expect(response.body.statusCode).toBe(201);
    expect(Number.isInteger(response.body.statusCode)).toBe(true);
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
      .expect(404)
      .expect(({ body }) => expect(body.statusCode).toBe(404));
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
      .expect(200)
      .expect(({ body }) => expect(body.statusCode).toBe(200));

    const updatedVehicle = await request(app.getHttpServer())
      .get(`/vehicles/plate/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(updatedVehicle.body.data.status).toBe('AVAILABLE');
    expect(updatedVehicle.body.data.mileage).toBe(initialMileage + 100);
  });

  it('rate limits repeated authentication attempts with numeric error codes', async () => {
    const responses = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      responses.push(
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: `unknown-${attempt}@fleetcore.test`,
            password: 'incorrect-password',
          }),
      );
    }

    const limited = responses.find(({ status }) => status === 429);
    expect(limited).toBeDefined();
    expect(limited?.body.statusCode).toBe(429);
    expect(
      responses.filter(({ status }) => status === 401).length,
    ).toBeGreaterThan(0);
  });
});
