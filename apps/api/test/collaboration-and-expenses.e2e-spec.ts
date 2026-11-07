import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CSRF_HEADER_NAME } from '@tripnest/shared';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';

describe('Collaboration & Expenses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const timestamp = Date.now();
  const ownerEmail = `collab_owner_${timestamp}@example.com`;
  const memberEmail = `collab_member_${timestamp}@example.com`;
  const outsiderEmail = `collab_outsider_${timestamp}@example.com`;
  const thirdMemberEmail = `collab_third_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  let ownerCookie: string;
  let memberCookie: string;
  let outsiderCookie: string;
  let thirdMemberCookie: string;

  let ownerUserId: string;
  let memberUserId: string;
  let thirdMemberUserId: string;

  let destinationId: string;
  let tripId: string;
  let day1Id: string;
  let invitationToken: string;
  let thirdInvitationToken: string;
  let suggestionId: string;
  let expenseId: string;

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

    const destination = await prisma.destination.findFirst();
    if (!destination) {
      throw new Error('No destination found in test database.');
    }
    destinationId = destination.id;

    // Helper to register user and extract cookie
    const registerUser = async (name: string, email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name, email, password: testPassword });
      const rawCookies = res.headers['set-cookie'];
      const cookie = Array.isArray(rawCookies)
        ? rawCookies[0]
        : (rawCookies as unknown as string);
      return { user: res.body.data.user, cookie };
    };

    const o = await registerUser('Alice Owner', ownerEmail);
    ownerCookie = o.cookie;
    ownerUserId = o.user.id;

    const m = await registerUser('Bob Member', memberEmail);
    memberCookie = m.cookie;
    memberUserId = m.user.id;

    const out = await registerUser('Eve Outsider', outsiderEmail);
    outsiderCookie = out.cookie;

    const t = await registerUser('Charlie Companion', thirdMemberEmail);
    thirdMemberCookie = t.cookie;
    thirdMemberUserId = t.user.id;

    // Create Trip as Owner
    const tripRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set('Cookie', ownerCookie)
      .set(CSRF_HEADER_NAME, 'true')
      .send({
        destinationId,
        title: 'Alpine Expedition',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        currency: 'INR',
      });

    expect(tripRes.status).toBe(201);
    tripId = tripRes.body.data.id;
    day1Id = tripRes.body.data.itineraryDays[0].id;
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: {
          email: { contains: 'collab_' },
        },
      });
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  // =========================================================================
  // 1. COLLABORATION & INVITATIONS
  // =========================================================================

  describe('Collaboration & Membership', () => {
    it('1. Owner can generate an invitation link for member', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/invitations`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({ email: memberEmail });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(memberEmail);
      expect(res.body.data.invitationUrl).toBeDefined();

      // Extract raw token from invitationUrl (/invite/:token)
      invitationToken = res.body.data.invitationUrl.replace('/invite/', '');
      expect(invitationToken).toHaveLength(64);
    });

    it('2. Prevent duplicate active pending invitation for same email', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/invitations`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({ email: memberEmail });

      expect(res.status).toBe(409);
    });

    it('3. Prevent owner from inviting themselves', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/invitations`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({ email: ownerEmail });

      expect(res.status).toBe(400);
    });

    it('4. Public can view invitation details by token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/invitations/${invitationToken}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.tripTitle).toBe('Alpine Expedition');
      expect(res.body.data.inviterEmail).toBe(ownerEmail);
      expect(res.body.data.email).toBe(memberEmail);
    });

    it('5. Wrong email cannot accept invitation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/invitations/${invitationToken}/accept`)
        .set('Cookie', outsiderCookie)
        .set(CSRF_HEADER_NAME, 'true');

      expect(res.status).toBe(403);
    });

    it('6. Correct invitee can accept invitation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/invitations/${invitationToken}/accept`)
        .set('Cookie', memberCookie)
        .set(CSRF_HEADER_NAME, 'true');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tripId).toBe(tripId);
    });

    it('7. Cannot re-accept already accepted invitation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/invitations/${invitationToken}/accept`)
        .set('Cookie', memberCookie)
        .set(CSRF_HEADER_NAME, 'true');

      expect(res.status).toBe(400);
    });

    it('8. Accepted trip appears in /api/trips/shared for member', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/trips/shared')
        .set('Cookie', memberCookie);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(tripId);
      expect(res.body.data[0].currentUserRole).toBe('MEMBER');
      expect(res.body.data[0].isOwner).toBe(false);
    });

    it('9. Member can view shared trip details and itinerary', async () => {
      const tripRes = await request(app.getHttpServer())
        .get(`/api/trips/${tripId}`)
        .set('Cookie', memberCookie);
      expect(tripRes.status).toBe(200);
      expect(tripRes.body.data.title).toBe('Alpine Expedition');

      const itinRes = await request(app.getHttpServer())
        .get(`/api/trips/${tripId}/itinerary`)
        .set('Cookie', memberCookie);
      expect(itinRes.status).toBe(200);
      expect(itinRes.body.data).toHaveLength(5);
    });

    it('10. Outsider cannot view trip details (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/trips/${tripId}`)
        .set('Cookie', outsiderCookie);

      expect(res.status).toBe(403);
    });

    it('11. Member cannot delete trip or create invitations', async () => {
      const delRes = await request(app.getHttpServer())
        .delete(`/api/trips/${tripId}`)
        .set('Cookie', memberCookie)
        .set(CSRF_HEADER_NAME, 'true');
      expect(delRes.status).toBe(403);

      const invRes = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/invitations`)
        .set('Cookie', memberCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({ email: 'another@example.com' });
      expect(invRes.status).toBe(403);
    });

    it('12. Invite and accept third member for split expenses testing', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/invitations`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({ email: thirdMemberEmail });
      expect(res.status).toBe(201);
      thirdInvitationToken = res.body.data.invitationUrl.replace('/invite/', '');

      const accRes = await request(app.getHttpServer())
        .post(`/api/invitations/${thirdInvitationToken}/accept`)
        .set('Cookie', thirdMemberCookie)
        .set(CSRF_HEADER_NAME, 'true');
      expect(accRes.status).toBe(200);

      const membersRes = await request(app.getHttpServer())
        .get(`/api/trips/${tripId}/members`)
        .set('Cookie', ownerCookie);
      expect(membersRes.status).toBe(200);
      expect(membersRes.body.data).toHaveLength(3);
    });
  });

  // =========================================================================
  // 2. ACTIVITY SUGGESTIONS & VOTING
  // =========================================================================

  describe('Activity Suggestions & Voting', () => {
    it('13. Member can suggest an activity for day 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/suggestions`)
        .set('Cookie', memberCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({
          itineraryDayId: day1Id,
          title: 'Summit Sunrise Hike',
          description: 'Catch sunrise at peak',
          location: 'Summit Trailhead',
          startTime: '05:30',
          durationMinutes: 120,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Summit Sunrise Hike');
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.voteCount).toBe(0);
      suggestionId = res.body.data.id;
    });

    it('14. Member can vote for suggestion and count increments', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/suggestions/${suggestionId}/vote`)
        .set('Cookie', thirdMemberCookie)
        .set(CSRF_HEADER_NAME, 'true');

      expect(res.status).toBe(200);
      expect(res.body.data.voteCount).toBe(1);
      expect(res.body.data.hasVoted).toBe(true);
    });

    it('15. Prevent duplicate votes by same member', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/suggestions/${suggestionId}/vote`)
        .set('Cookie', thirdMemberCookie)
        .set(CSRF_HEADER_NAME, 'true');

      expect(res.status).toBe(409);
    });

    it('16. Non-owner cannot approve suggestion', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${tripId}/suggestions/${suggestionId}/status`)
        .set('Cookie', memberCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
    });

    it('17. Owner approves suggestion and it converts to confirmed Activity', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${tripId}/suggestions/${suggestionId}/status`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');

      // Verify that activity appears in Day 1 itinerary
      const itinRes = await request(app.getHttpServer())
        .get(`/api/trips/${tripId}/itinerary`)
        .set('Cookie', ownerCookie);

      const day1 = itinRes.body.data.find((d: any) => d.id === day1Id);
      expect(day1.activities.some((a: any) => a.title === 'Summit Sunrise Hike')).toBe(
        true,
      );
    });
  });

  // =========================================================================
  // 3. SHARED EXPENSES & BALANCES
  // =========================================================================

  describe('Shared Expenses & Group Balances', () => {
    it('18. Member creates equal split expense with exact rounding', async () => {
      // Member pays 100 INR split equally among owner, member, thirdMember (33.34, 33.33, 33.33)
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/expenses`)
        .set('Cookie', memberCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({
          title: 'Camp Stove & Fuel',
          category: 'Activities',
          amount: 100.0,
          currency: 'INR',
          paidById: memberUserId,
          expenseDate: '2026-08-01',
          splitMethod: 'EQUAL',
          splits: [
            { userId: memberUserId },
            { userId: ownerUserId },
            { userId: thirdMemberUserId },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(100.0);
      expect(res.body.data.splits).toHaveLength(3);

      const splits = res.body.data.splits;
      const totalSplits = splits.reduce((acc: number, s: any) => acc + s.amount, 0);
      expect(Number(totalSplits.toFixed(2))).toBe(100.0);
      expenseId = res.body.data.id;
    });

    it('19. Owner creates custom split expense', async () => {
      // Owner pays 300 INR for Chalet: 100 each
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/expenses`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({
          title: 'Mountain Chalet',
          category: 'Accommodation',
          amount: 300.0,
          currency: 'INR',
          paidById: ownerUserId,
          expenseDate: '2026-08-01',
          splitMethod: 'CUSTOM',
          splits: [
            { userId: ownerUserId, amount: 100.0 },
            { userId: memberUserId, amount: 100.0 },
            { userId: thirdMemberUserId, amount: 100.0 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(300.0);
    });

    it('20. Reject invalid custom split where sum != total', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/expenses`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({
          title: 'Dinner at Peak',
          category: 'Food & Drinks',
          amount: 150.0,
          paidById: ownerUserId,
          expenseDate: '2026-08-01',
          splitMethod: 'CUSTOM',
          splits: [
            { userId: ownerUserId, amount: 50.0 },
            { userId: memberUserId, amount: 50.0 },
            { userId: thirdMemberUserId, amount: 40.0 }, // sum = 140 != 150
          ],
        });

      expect(res.status).toBe(400);
    });

    it('21. Reject expense with mismatched currency', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/trips/${tripId}/expenses`)
        .set('Cookie', ownerCookie)
        .set(CSRF_HEADER_NAME, 'true')
        .send({
          title: 'Flight Taxi',
          category: 'Transport',
          amount: 50.0,
          currency: 'USD', // trip is INR
          paidById: ownerUserId,
          expenseDate: '2026-08-01',
          splitMethod: 'EQUAL',
          splits: [{ userId: ownerUserId }],
        });

      expect(res.status).toBe(400);
    });

    it('22. Non-creator non-owner cannot delete expense', async () => {
      // Third member tries to delete expense created by Member
      const res = await request(app.getHttpServer())
        .delete(`/api/trips/${tripId}/expenses/${expenseId}`)
        .set('Cookie', thirdMemberCookie)
        .set(CSRF_HEADER_NAME, 'true');

      expect(res.status).toBe(403);
    });

    it('23. Accurate group balances & settlement suggestions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/trips/${tripId}/expenses/balances`)
        .set('Cookie', ownerCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.totalTripExpenses).toBe(400.0);
      expect(res.body.data.members).toHaveLength(3);
      expect(res.body.data.settlements.length).toBeGreaterThan(0);

      // Verify category breakdown exists
      expect(res.body.data.categoryBreakdown.length).toBeGreaterThan(0);
    });

    it('24. Global user expenses overview returns summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/expenses/overview')
        .set('Cookie', memberCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.totalLogged).toBe(400.0);
      expect(res.body.data.youPaid).toBe(100.0);
      expect(res.body.data.trips).toHaveLength(1);
    });
  });
});
