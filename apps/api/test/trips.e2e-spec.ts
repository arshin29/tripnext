import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CSRF_HEADER_NAME } from '@tripnest/shared';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';

describe('Trips & Itinerary (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const user1Email = `trips_e2e_1_${Date.now()}@example.com`;
  const user2Email = `trips_e2e_2_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let user1Cookie: string;
  let user2Cookie: string;
  let destinationId: string;

  let createdTripId: string;
  let createdDayId: string;
  let createdActivityId1: string;
  let createdActivityId2: string;

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

    // Get an existing destination
    const destination = await prisma.destination.findFirst();
    if (!destination) {
      throw new Error('No destination found in test database. Run seed first.');
    }
    destinationId = destination.id;

    // Register User 1
    const regRes1 = await request(app.getHttpServer()).post('/api/auth/register').send({
      name: 'Tripper One',
      email: user1Email,
      password: testPassword,
    });
    const rawCookies1 = regRes1.headers['set-cookie'];
    user1Cookie = Array.isArray(rawCookies1)
      ? rawCookies1[0]
      : (rawCookies1 as unknown as string);

    // Register User 2
    const regRes2 = await request(app.getHttpServer()).post('/api/auth/register').send({
      name: 'Tripper Two',
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
      // Clean up trips and users created during this test
      await prisma.user.deleteMany({
        where: {
          email: { contains: 'trips_e2e_' },
        },
      });
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  describe('Security & Authentication', () => {
    it('1. should reject unauthenticated GET /api/trips', async () => {
      await request(app.getHttpServer()).get('/api/trips').expect(401);
    });

    it('2. should reject trip creation without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/trips')
        .send({
          title: 'Unauthenticated Trip',
          destinationId,
          startDate: '2026-12-01',
          endDate: '2026-12-03',
        })
        .expect(401);
    });

    it('3. should reject trip creation with cookie but missing CSRF header', async () => {
      await request(app.getHttpServer())
        .post('/api/trips')
        .set('Cookie', user1Cookie)
        .send({
          title: 'CSRF Missing Trip',
          destinationId,
          startDate: '2026-12-01',
          endDate: '2026-12-03',
        })
        .expect(403);
    });
  });

  describe('Trip Creation & Automatic Day Generation', () => {
    it('4. should create a trip and automatically generate itinerary days', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/trips')
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          title: 'Alpine Escape 2026',
          description: 'A serene mountain getaway',
          destinationId,
          startDate: '2026-12-01',
          endDate: '2026-12-03',
          travelerCount: 2,
          budgetAmount: 120000,
          currency: 'INR',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Alpine Escape 2026');
      expect(res.body.data.travelerCount).toBe(2);
      expect(Number(res.body.data.budgetAmount)).toBe(120000);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.destination).toBeDefined();
      expect(res.body.data.destination.id).toBe(destinationId);
      expect(res.body.data.status).toBe('UPCOMING');

      createdTripId = res.body.data.id;

      // Verify 3 days were generated (Dec 1, 2, 3)
      expect(Array.isArray(res.body.data.itineraryDays)).toBe(true);
      expect(res.body.data.itineraryDays.length).toBe(3);
      expect(res.body.data.itineraryDays[0].dayNumber).toBe(1);
      expect(res.body.data.itineraryDays[1].dayNumber).toBe(2);
      expect(res.body.data.itineraryDays[2].dayNumber).toBe(3);

      createdDayId = res.body.data.itineraryDays[0].id;
    });

    it('5. should list trips for user 1 including the new trip', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/trips')
        .set('Cookie', user1Cookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(createdTripId);
      expect(res.body.data[0].activitiesCount).toBe(0);
      expect(res.body.data[0].completedActivitiesCount).toBe(0);
    });

    it('6. should filter trips by status', async () => {
      const resUpcoming = await request(app.getHttpServer())
        .get('/api/trips?status=UPCOMING')
        .set('Cookie', user1Cookie)
        .expect(200);

      expect(resUpcoming.body.success).toBe(true);
      expect(resUpcoming.body.data.length).toBe(1);

      const resPast = await request(app.getHttpServer())
        .get('/api/trips?status=COMPLETED')
        .set('Cookie', user1Cookie)
        .expect(200);

      expect(resPast.body.success).toBe(true);
      expect(resPast.body.data.length).toBe(0);
    });

    it('7. should get single trip details by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/trips/${createdTripId}`)
        .set('Cookie', user1Cookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdTripId);
      expect(res.body.data.destination).toBeDefined();
      expect(res.body.data.itineraryDays.length).toBe(3);
    });
  });

  describe('User Isolation & Authorization', () => {
    it('8. should isolate trips so user 2 cannot see user 1 trips', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/trips')
        .set('Cookie', user2Cookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('9. should return 403 when user 2 attempts to view user 1 trip', async () => {
      await request(app.getHttpServer())
        .get(`/api/trips/${createdTripId}`)
        .set('Cookie', user2Cookie)
        .expect(403);
    });

    it('10. should return 403 when user 2 attempts to update user 1 trip', async () => {
      await request(app.getHttpServer())
        .patch(`/api/trips/${createdTripId}`)
        .set('Cookie', user2Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({ title: 'Hacked Title' })
        .expect(403);
    });

    it('11. should return 403 when user 2 attempts to delete user 1 trip', async () => {
      await request(app.getHttpServer())
        .delete(`/api/trips/${createdTripId}`)
        .set('Cookie', user2Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .expect(403);
    });
  });

  describe('Trip Updates & Itinerary Days', () => {
    it('12. should update trip details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${createdTripId}`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          title: 'Alpine Escape 2026 - Extended',
          endDate: '2026-12-04',
          travelerCount: 3,
          budgetAmount: 150000,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Alpine Escape 2026 - Extended');
      expect(res.body.data.travelerCount).toBe(3);
      expect(Number(res.body.data.budgetAmount)).toBe(150000);
    });

    it('13. should fetch itinerary days for trip', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/trips/${createdTripId}/itinerary`)
        .set('Cookie', user1Cookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.data[0].activities).toEqual([]);
    });

    it('14. should update an itinerary day title and notes', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${createdTripId}/itinerary/days/${createdDayId}`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          title: 'Arrival & Scenic Stroll',
          notes: 'Check-in before 3 PM and explore town center.',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Arrival & Scenic Stroll');
      expect(res.body.data.notes).toBe('Check-in before 3 PM and explore town center.');
    });

    it('15. should allow adding an extra itinerary day', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${createdTripId}/itinerary/days`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          dayNumber: 4,
          title: 'Bonus Exploration Day',
          date: '2026-12-04',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.dayNumber).toBe(4);
      expect(res.body.data.title).toBe('Bonus Exploration Day');
    });
  });

  describe('Activity Management', () => {
    it('16. should add an activity to Day 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${createdTripId}/activities`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          itineraryDayId: createdDayId,
          title: 'Morning Mountain Gondola Ride',
          description: 'Take cable car up to the summit observation deck',
          location: 'Peak Cable Car Station',
          startTime: '09:00',
          durationMinutes: 120,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Morning Mountain Gondola Ride');
      expect(res.body.data.sortOrder).toBe(0);
      expect(res.body.data.isCompleted).toBe(false);

      createdActivityId1 = res.body.data.id;
    });

    it('17. should add a second activity to Day 1 with auto-incremented sortOrder', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${createdTripId}/activities`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          itineraryDayId: createdDayId,
          title: 'Alpine Fondue Lunch',
          location: 'Summit Panorama Restaurant',
          startTime: '12:30',
          durationMinutes: 90,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Alpine Fondue Lunch');
      expect(res.body.data.sortOrder).toBe(1);

      createdActivityId2 = res.body.data.id;
    });

    it('18. should reorder activities on Day 1', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${createdTripId}/activities/reorder`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          itineraryDayId: createdDayId,
          activityIds: [createdActivityId2, createdActivityId1],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0].id).toBe(createdActivityId2);
      expect(res.body.data[0].sortOrder).toBe(0);
      expect(res.body.data[1].id).toBe(createdActivityId1);
      expect(res.body.data[1].sortOrder).toBe(1);
    });

    it('19. should toggle activity completion status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${createdTripId}/activities/${createdActivityId1}/complete`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isCompleted).toBe(true);

      // Verify trip list reflects completion progress
      const tripRes = await request(app.getHttpServer())
        .get('/api/trips')
        .set('Cookie', user1Cookie)
        .expect(200);

      const trip = tripRes.body.data.find((t: any) => t.id === createdTripId);
      expect(trip.activitiesCount).toBe(2);
      expect(trip.completedActivitiesCount).toBe(1);
    });

    it('20. should update activity details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${createdTripId}/activities/${createdActivityId1}`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          title: 'Early Morning Mountain Gondola Ride',
          startTime: '08:30',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Early Morning Mountain Gondola Ride');
      expect(res.body.data.startTime).toBe('08:30');
    });

    it('21. should delete an activity', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/trips/${createdTripId}/activities/${createdActivityId2}`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify only 1 activity remains in itinerary
      const itRes = await request(app.getHttpServer())
        .get(`/api/trips/${createdTripId}/itinerary`)
        .set('Cookie', user1Cookie)
        .expect(200);

      const day1 = itRes.body.data.find((d: any) => d.id === createdDayId);
      expect(day1.activities.length).toBe(1);
      expect(day1.activities[0].id).toBe(createdActivityId1);
    });

    it('22. should delete the entire trip and cascade delete its days and activities', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/trips/${createdTripId}`)
        .set('Cookie', user1Cookie)
        .set(CSRF_HEADER_NAME, '1')
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify trip is deleted
      await request(app.getHttpServer())
        .get(`/api/trips/${createdTripId}`)
        .set('Cookie', user1Cookie)
        .expect(404);
    });
  });
});
