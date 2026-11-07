import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CSRF_HEADER_NAME } from '@tripnest/shared';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';

describe('AI Travel Concierge (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const ownerEmail = `ai_owner_${Date.now()}@example.com`;
  const strangerEmail = `ai_stranger_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  let ownerCookie: string;
  let strangerCookie: string;
  let destinationId: string;

  let ownerTripId: string;
  let ownerDay1Id: string;
  let ownerDay2Id: string;

  let strangerTripId: string;
  let strangerDayId: string;

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

    // Find a destination with attractions (e.g. Kyoto or any destination)
    const destination = await prisma.destination.findFirst({
      where: {
        attractions: { isEmpty: false },
      },
    });

    if (!destination) {
      throw new Error(
        'No destination with attractions found in database. Seed must be run first.',
      );
    }
    destinationId = destination.id;

    // 1. Register Owner
    const regOwner = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Concierge Owner',
        email: ownerEmail,
        password: testPassword,
      });
    expect(regOwner.status).toBe(201);
    ownerCookie = regOwner.headers['set-cookie'][0];

    // 2. Register Stranger
    const regStranger = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Stranger User',
        email: strangerEmail,
        password: testPassword,
      });
    expect(regStranger.status).toBe(201);
    strangerCookie = regStranger.headers['set-cookie'][0];

    // 3. Create Owner Trip
    const tripRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set('Cookie', ownerCookie)
      .set(CSRF_HEADER_NAME, '1')
      .send({
        title: 'Kyoto AI Discovery Tour',
        destinationId,
        startDate: '2026-11-20T00:00:00.000Z',
        endDate: '2026-11-22T00:00:00.000Z',
        travelerCount: 2,
        budgetAmount: 1500,
        currency: 'USD',
      });
    expect(tripRes.status).toBe(201);
    ownerTripId = tripRes.body.data.id;

    // Get itinerary days for owner trip
    const itinRes = await request(app.getHttpServer())
      .get(`/api/trips/${ownerTripId}/itinerary`)
      .set('Cookie', ownerCookie);
    expect(itinRes.status).toBe(200);
    expect(itinRes.body.data.length).toBeGreaterThanOrEqual(2);
    ownerDay1Id = itinRes.body.data[0].id;
    ownerDay2Id = itinRes.body.data[1].id;

    // 4. Create Stranger Trip
    const strangerTripRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set('Cookie', strangerCookie)
      .set(CSRF_HEADER_NAME, '1')
      .send({
        title: 'Stranger Separate Trip',
        destinationId,
        startDate: '2026-12-01T00:00:00.000Z',
        endDate: '2026-12-02T00:00:00.000Z',
        travelerCount: 1,
      });
    expect(strangerTripRes.status).toBe(201);
    strangerTripId = strangerTripRes.body.data.id;

    const strangerItinRes = await request(app.getHttpServer())
      .get(`/api/trips/${strangerTripId}/itinerary`)
      .set('Cookie', strangerCookie);
    strangerDayId = strangerItinRes.body.data[0].id;
  });

  afterAll(async () => {
    try {
      // Clean up activities created in tests
      if (ownerTripId) {
        await prisma.activity.deleteMany({
          where: {
            itineraryDay: { tripId: ownerTripId },
          },
        });
        await prisma.itineraryDay.deleteMany({
          where: { tripId: ownerTripId },
        });
        await prisma.tripMember.deleteMany({
          where: { tripId: ownerTripId },
        });
        await prisma.trip.deleteMany({
          where: { id: ownerTripId },
        });
      }

      if (strangerTripId) {
        await prisma.activity.deleteMany({
          where: {
            itineraryDay: { tripId: strangerTripId },
          },
        });
        await prisma.itineraryDay.deleteMany({
          where: { tripId: strangerTripId },
        });
        await prisma.tripMember.deleteMany({
          where: { tripId: strangerTripId },
        });
        await prisma.trip.deleteMany({
          where: { id: strangerTripId },
        });
      }

      await prisma.user.deleteMany({
        where: {
          email: { in: [ownerEmail, strangerEmail] },
        },
      });
    } catch {
      // Ignore cleanup error
    } finally {
      await app.close();
    }
  });

  describe('Security & Authentication', () => {
    it('1. should reject suggestions request without authentication with 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/suggestions`)
        .send({ pace: 'BALANCED' });

      expect(res.status).toBe(401);
    });

    it('2. should reject import request without authentication with 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/import`)
        .send({
          proposals: [{ itineraryDayId: ownerDay1Id, title: 'Sample' }],
        });

      expect(res.status).toBe(401);
    });

    it('3. should reject cookie-authenticated suggestions request without CSRF header with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/suggestions`)
        .set('Cookie', ownerCookie)
        .send({ pace: 'BALANCED' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('CSRF');
    });

    it('4. should reject cookie-authenticated import request without CSRF header with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/import`)
        .set('Cookie', ownerCookie)
        .send({
          proposals: [{ itineraryDayId: ownerDay1Id, title: 'Sample' }],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('CSRF');
    });

    it('5. should reject suggestions request for trip user does not belong to with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/suggestions`)
        .set('Cookie', strangerCookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({ pace: 'BALANCED' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permission');
    });

    it('6. should reject import request for trip user does not belong to with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/import`)
        .set('Cookie', strangerCookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          proposals: [{ itineraryDayId: ownerDay1Id, title: 'Sample' }],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permission');
    });
  });

  describe('AI / Fallback Suggestions Generation', () => {
    it('7. should generate activity suggestions with valid structure and disclaimer', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/suggestions`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          pace: 'BALANCED',
          themes: ['CULTURE', 'FOOD'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.tripId).toBe(ownerTripId);
      expect(data.destinationName).toBeTruthy();
      expect(['GEMINI', 'CURATED_FALLBACK']).toContain(data.source);
      expect(data.suggestions.length).toBeGreaterThan(0);
      expect(data.disclaimer).toBeTruthy();

      // Check proposal structure
      const first = data.suggestions[0];
      expect(first.id).toBeTruthy();
      expect(first.dayNumber).toBeGreaterThanOrEqual(1);
      expect(first.itineraryDayId).toBeTruthy();
      expect(first.title).toBeTruthy();
      expect(first.durationMinutes).toBeGreaterThan(0);

      if (data.source === 'CURATED_FALLBACK') {
        expect(first.latitude).toBeNull();
        expect(first.longitude).toBeNull();
        expect(first.estimatedCost).toBeNull();
      }
    });
  });

  describe('Secure Batch Import Validation & Execution', () => {
    it('8. should reject import with empty proposals array with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/import`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({ proposals: [] });

      expect(res.status).toBe(400);
    });

    it('9. should reject proposal targeting a day belonging to another trip with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/import`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          proposals: [
            {
              itineraryDayId: strangerDayId, // belongs to strangerTripId, not ownerTripId!
              title: 'Attempted Cross-Trip Injection',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not belong to this trip');
    });

    it('10. should reject proposal with only latitude but missing longitude with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/import`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          proposals: [
            {
              itineraryDayId: ownerDay1Id,
              title: 'Single coordinate failure',
              latitude: 35.0,
            },
          ],
        });

      expect(res.status).toBe(400);
    });

    it('11. should successfully import valid proposals into the itinerary', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/import`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          proposals: [
            {
              itineraryDayId: ownerDay1Id,
              title: 'First Morning Walk',
              description: 'Gentle walk around the old district.',
              startTime: '09:30',
              durationMinutes: 90,
              latitude: 35.0116,
              longitude: 135.7681,
            },
            {
              itineraryDayId: ownerDay1Id,
              title: 'Traditional Tea Ceremony',
              description: 'Authentic matcha experience.',
              startTime: '14:00',
              durationMinutes: 60,
            },
            {
              itineraryDayId: ownerDay2Id,
              title: 'Day 2 Garden Visit',
              description: 'Zen rock garden stroll.',
              startTime: '10:00',
              durationMinutes: 120,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.importedCount).toBe(3);
      expect(res.body.data.skippedCount).toBe(0);
      expect(res.body.data.importedActivities).toHaveLength(3);

      // Verify in DB
      const activitiesDay1 = await prisma.activity.findMany({
        where: { itineraryDayId: ownerDay1Id },
        orderBy: { sortOrder: 'asc' },
      });

      expect(activitiesDay1).toHaveLength(2);
      expect(activitiesDay1[0].title).toBe('First Morning Walk');
      expect(activitiesDay1[0].sortOrder).toBe(0);
      expect(activitiesDay1[0].latitude).toBe(35.0116);
      expect(activitiesDay1[0].longitude).toBe(135.7681);
      expect(activitiesDay1[1].title).toBe('Traditional Tea Ceremony');
      expect(activitiesDay1[1].sortOrder).toBe(1);
    });

    it('12. should skip duplicate activities on the same day and append new ones with incremented sortOrder', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${ownerTripId}/ai/import`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, '1')
        .send({
          proposals: [
            {
              itineraryDayId: ownerDay1Id,
              title: 'first morning walk', // Duplicate of 'First Morning Walk' (case-insensitive)
            },
            {
              itineraryDayId: ownerDay1Id,
              title: 'Evening Lantern Walk', // New activity on Day 1
              startTime: '19:00',
              durationMinutes: 90,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.importedCount).toBe(1);
      expect(res.body.data.skippedCount).toBe(1);

      // Verify Day 1 now has 3 activities with sortOrder 0, 1, 2
      const activitiesDay1 = await prisma.activity.findMany({
        where: { itineraryDayId: ownerDay1Id },
        orderBy: { sortOrder: 'asc' },
      });

      expect(activitiesDay1).toHaveLength(3);
      expect(activitiesDay1[2].title).toBe('Evening Lantern Walk');
      expect(activitiesDay1[2].sortOrder).toBe(2);
    });

    it('13. should handle concurrent simultaneous import requests safely without duplicating activities', async () => {
      const concurrentProposal = {
        itineraryDayId: ownerDay2Id,
        title: 'Concurrent Temple Walk',
        description: 'Simultaneous import attempt test.',
        startTime: '16:00',
        durationMinutes: 60,
      };

      // Dispatch two requests concurrently
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/trips/${ownerTripId}/ai/import`)
          .set('Cookie', ownerCookie)
          .set(CSRF_HEADER_NAME, '1')
          .send({ proposals: [concurrentProposal] }),
        request(app.getHttpServer())
          .post(`/api/trips/${ownerTripId}/ai/import`)
          .set('Cookie', ownerCookie)
          .set(CSRF_HEADER_NAME, '1')
          .send({ proposals: [concurrentProposal] }),
      ]);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);

      // One request should have imported 1 and skipped 0; the other should have imported 0 and skipped 1
      const totalImported =
        res1.body.data.importedCount + res2.body.data.importedCount;
      const totalSkipped =
        res1.body.data.skippedCount + res2.body.data.skippedCount;

      expect(totalImported).toBe(1);
      expect(totalSkipped).toBe(1);

      // Verify in DB that only 1 record exists with title 'Concurrent Temple Walk'
      const activities = await prisma.activity.findMany({
        where: {
          itineraryDayId: ownerDay2Id,
          title: 'Concurrent Temple Walk',
        },
      });

      expect(activities).toHaveLength(1);
    });
  });
});
