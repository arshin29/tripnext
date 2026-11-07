import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CSRF_HEADER_NAME } from '@tripnest/shared';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';

describe('Destinations & Wishlist (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const user1Email = `dest_e2e_1_${Date.now()}@example.com`;
  const user2Email = `dest_e2e_2_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let user1Cookie: string;
  let user2Cookie: string;
  let sampleDestinationId: string;
  let sampleDestinationSlug: string;

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

    // Register User 1
    const regRes1 = await request(app.getHttpServer()).post('/api/auth/register').send({
      name: 'Wanderer One',
      email: user1Email,
      password: testPassword,
    });
    const rawCookies1 = regRes1.headers['set-cookie'];
    user1Cookie = Array.isArray(rawCookies1)
      ? rawCookies1[0]
      : (rawCookies1 as unknown as string);

    // Register User 2
    const regRes2 = await request(app.getHttpServer()).post('/api/auth/register').send({
      name: 'Wanderer Two',
      email: user2Email,
      password: testPassword,
    });
    const rawCookies2 = regRes2.headers['set-cookie'];
    user2Cookie = Array.isArray(rawCookies2)
      ? rawCookies2[0]
      : (rawCookies2 as unknown as string);
  });

  afterAll(async () => {
    try {
      await prisma.savedDestination.deleteMany({
        where: {
          user: {
            email: {
              contains: 'dest_e2e_',
            },
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'dest_e2e_',
          },
        },
      });
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  describe('GET /api/destinations', () => {
    it('1. should return paginated destinations with total count and metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/destinations?page=1&limit=6')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(6);
      expect(res.body.data.total).toBeGreaterThanOrEqual(24);
      expect(res.body.data.totalPages).toBeGreaterThanOrEqual(4);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBe(6);

      const firstItem = res.body.data.items[0];
      sampleDestinationId = firstItem.id;
      sampleDestinationSlug = firstItem.slug;
      expect(firstItem.name).toBeDefined();
      expect(firstItem.category).toBeDefined();
      expect(firstItem.coverImage).toBeDefined();
    });

    it('2. should filter destinations by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/destinations?category=Alpine')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      res.body.data.items.forEach((item: any) => {
        expect(item.category.toLowerCase()).toBe('alpine');
      });
    });

    it('3. should search destinations by keyword', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/destinations?search=Kyoto')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.items[0].city).toBe('Kyoto');
    });

    it('4. should filter destinations by featured status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/destinations?featured=true')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      res.body.data.items.forEach((item: any) => {
        expect(item.isFeatured).toBe(true);
      });
    });
  });

  describe('GET /api/destinations/featured', () => {
    it('5. should return curated featured destinations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/destinations/featured')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((item: any) => {
        expect(item.isFeatured).toBe(true);
      });
    });
  });

  describe('GET /api/destinations/categories', () => {
    it('6. should return category counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/destinations/categories')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const categoryNames = res.body.data.map((c: any) => c.name);
      expect(categoryNames).toContain('Cultural');
      expect(categoryNames).toContain('Alpine');
    });
  });

  describe('GET /api/destinations/:slug', () => {
    it('7. should return full destination details by slug', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/destinations/${sampleDestinationSlug}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe(sampleDestinationSlug);
      expect(Array.isArray(res.body.data.galleryImages)).toBe(true);
      expect(Array.isArray(res.body.data.attractions)).toBe(true);
      expect(res.body.data.attractions.length).toBeGreaterThan(0);
      expect(res.body.data.bestTimeToVisit).toBeDefined();
    });

    it('8. should return 404 for non-existent slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/destinations/non-existent-atlantis-destination')
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('Saved Destinations (Wishlist) & Security', () => {
    it('9. should reject unauthenticated request to /api/saved-destinations', async () => {
      await request(app.getHttpServer()).get('/api/saved-destinations').expect(401);
    });

    it('10. should return empty list initially for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/saved-destinations')
        .set('Cookie', user1Cookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('11. should reject state-changing POST without CSRF header', async () => {
      await request(app.getHttpServer())
        .post(`/api/saved-destinations/${sampleDestinationId}`)
        .set('Cookie', user1Cookie)
        .expect(403);
    });

    it('12. should successfully save a destination with cookie and CSRF header', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/saved-destinations/${sampleDestinationId}`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.destinationId).toBe(sampleDestinationId);
      expect(res.body.data.destination.name).toBeDefined();
    });

    it('13. should handle duplicate save gracefully and idempotently', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/saved-destinations/${sampleDestinationId}`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.destinationId).toBe(sampleDestinationId);
    });

    it('14. should list the saved destination for user 1', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/saved-destinations')
        .set('Cookie', user1Cookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].destinationId).toBe(sampleDestinationId);
    });

    it('15. should enforce user isolation: user 2 should NOT see user 1 saved destinations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/saved-destinations')
        .set('Cookie', user2Cookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('16. should remove saved destination with CSRF header', async () => {
      const delRes = await request(app.getHttpServer())
        .delete(`/api/saved-destinations/${sampleDestinationId}`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .expect(200);

      expect(delRes.body.success).toBe(true);

      const listRes = await request(app.getHttpServer())
        .get('/api/saved-destinations')
        .set('Cookie', user1Cookie)
        .expect(200);

      expect(listRes.body.data).toEqual([]);
    });
  });
});
