import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAME, CSRF_HEADER_NAME } from '@tripnest/shared';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';

describe('Authentication & User Profiles (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = `e2e_user_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Seraphina Lin';
  let sessionCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
    await app.listen(0);

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up test users created during the test
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'e2e_user_',
          },
        },
      });
    } catch {
      // Ignore cleanup error if already deleted
    }
    await app.close();
  });

  const getCookies = (res: request.Response): string[] => {
    const raw = res.headers['set-cookie'];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return [raw];
    return [];
  };

  describe('Registration', () => {
    it('1. should register successfully with valid details, set HttpOnly cookie, and return safe user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: testName,
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.name).toBe(testName);
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Verify Set-Cookie header
      const cookies = getCookies(res);
      expect(cookies.length).toBeGreaterThan(0);
      const authCookie = cookies.find((c: string) =>
        c.startsWith(`${AUTH_COOKIE_NAME}=`),
      );
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
      expect(authCookie).toContain('Path=/');
      expect(authCookie!.toLowerCase()).toContain('samesite=lax');

      sessionCookie = authCookie!.split(';')[0];
    });

    it('2. should reject duplicate email registration with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Lin',
          email: testEmail.toUpperCase(), // test case-insensitivity
          password: testPassword,
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('3. should reject invalid registration input with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'A', // too short
          email: 'not-an-email',
          password: 'short', // too short and weak
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('Login', () => {
    it('4. should login successfully with correct credentials and set HttpOnly cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.data.user.passwordHash).toBeUndefined();

      const cookies = getCookies(res);
      const authCookie = cookies.find((c: string) =>
        c.startsWith(`${AUTH_COOKIE_NAME}=`),
      );
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');

      sessionCookie = authCookie!.split(';')[0];
    });

    it('5. should reject login with incorrect password with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword999!',
        })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  describe('Protected Endpoints & Current User', () => {
    it('6. should reject unauthenticated access to /api/auth/me with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me').expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('7. should grant access to /api/auth/me with valid session cookie and return safe user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', [sessionCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.data.user.name).toBe(testName);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });
  });

  describe('Profile Updates & CSRF Protection', () => {
    it('8. should reject cookie-authenticated state-changing PATCH without CSRF header with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/auth/profile')
        .set('Cookie', [sessionCookie])
        .send({
          name: 'Hacked Name Attempt',
        })
        .expect(403);

      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toContain('CSRF');
    });

    it('9. should update profile name with valid session cookie and CSRF header', async () => {
      const updatedName = 'Seraphina Lin-Updated';
      const res = await request(app.getHttpServer())
        .patch('/api/auth/profile')
        .set('Cookie', [sessionCookie])
        .set(CSRF_HEADER_NAME, '1')
        .send({
          name: updatedName,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe(updatedName);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('10. should update password when valid current password is provided', async () => {
      const newPassword = 'NewSecurePassword456!';
      const res = await request(app.getHttpServer())
        .patch('/api/auth/profile')
        .set('Cookie', [sessionCookie])
        .set(CSRF_HEADER_NAME, '1')
        .send({
          currentPassword: testPassword,
          newPassword,
        })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify that old password no longer works for login
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(401);

      // Verify new password works
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);

      expect(loginRes.body.success).toBe(true);
      const cookies = getCookies(loginRes);
      const authCookie = cookies.find((c: string) =>
        c.startsWith(`${AUTH_COOKIE_NAME}=`),
      );
      sessionCookie = authCookie!.split(';')[0];
    });

    it('11. should reject password update if current password is incorrect', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/auth/profile')
        .set('Cookie', [sessionCookie])
        .set(CSRF_HEADER_NAME, '1')
        .send({
          currentPassword: 'IncorrectOldPassword123!',
          newPassword: 'AnotherNewPassword789!',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toContain('current password');
    });
  });

  describe('Logout', () => {
    it('12. should log out and clear the session cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', [sessionCookie])
        .set(CSRF_HEADER_NAME, '1')
        .expect(200);

      expect(res.body.success).toBe(true);

      const cookies = getCookies(res);
      const authCookie = cookies.find((c: string) =>
        c.startsWith(`${AUTH_COOKIE_NAME}=`),
      );
      expect(authCookie).toBeDefined();
      // Should expire or be cleared
      expect(
        authCookie!.includes('Max-Age=0') ||
          authCookie!.includes('Expires=Thu, 01 Jan 1970'),
      ).toBe(true);
    });
  });
});
