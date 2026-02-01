import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';
import { getBusinessType } from '@/lib/economy';

const RegistrationSchema = z.object({
  name: z.string().min(3).max(50),
  businessTypeId: z.string().min(1).max(50),
  branding: z
    .object({
      themeColor: z.string().min(1).max(32).optional(),
      logoUrl: z.string().url().optional(),
      icon: z.string().min(1).max(16).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limit Check (5 registrations per minute per IP)
    const limiter = rateLimit(request, 5, 60000);
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    const body = await request.json();
    const result = RegistrationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid data', details: result.error.format() }, { status: 400 });
    }

    const { name, businessTypeId, branding } = result.data;
    const FieldValue = admin.firestore.FieldValue;

    const businessesRef = adminDb.collection('businesses');

    const nameQuery = await businessesRef.where('name', '==', name).get();
    if (!nameQuery.empty) {
      return NextResponse.json({ error: `The name "${name}" is already taken.` }, { status: 400 });
    }

    const selectedType = getBusinessType(businessTypeId);
    if (!selectedType) {
      return NextResponse.json({ error: 'Invalid business type' }, { status: 400 });
    }

    // ATOMIC BATCH - Ensure data consistency
    const newBizId = adminDb.collection('businesses').doc().id;
    const nowIso = new Date().toISOString();

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    const ownerName = userData.firstName || userData.displayName || "Founder";
    const userBCoins = typeof userData.bCoins === 'number' ? userData.bCoins : 0;

    if (userData.hasBusiness && userData.businessID) {
      return NextResponse.json({ error: 'Business already registered' }, { status: 403 });
    }

    const REGISTRATION_COST = 250;
    if (userBCoins < REGISTRATION_COST) {
      return NextResponse.json({
        error: `Insufficient B-Coins. You need ${REGISTRATION_COST} B-Coins to register a business (you have ${userBCoins}).`
      }, { status: 403 });
    }

    const cleanBranding = branding
      ? Object.fromEntries(Object.entries(branding).filter(([_, v]) => v !== undefined))
      : {};

    const startingCapital = selectedType.startingCapital;

    const businessData = {
      // Ownership
      id: newBizId,
      ownerId: userId,
      ownerName,
      playerId: userId,

      // Economy model
      businessTypeId: selectedType.id,
      businessName: name,
      branding: cleanBranding,
      cashBalance: startingCapital,
      totalRevenue: 0,
      totalExpenses: 0,
      reputation: 50,
      customerSatisfaction: 70,
      reviewCount: 0,
      operatingHours: { open: 8, close: 20 },
      staffCount: 1,
      maxConcurrentOrders: selectedType.demandConfig.maxConcurrentOrders,
      inventory: {},
      employees: [
        {
          id: `emp_${Date.now()}`,
          name: `${userId.slice(0, 5)} Manager`,
          role: 'manager',
          salaryPerDay: selectedType.operatingCosts.staffPerHour
            ? selectedType.operatingCosts.staffPerHour * 8
            : 200,
          stats: { speed: 50, quality: 50, morale: 100 },
          unpaidWages: 0,
          hiredAt: nowIso,
        },
      ],
      marketState: {
        lastRestock: nowIso,
        nextRestock: new Date(Date.now() + 300000).toISOString(),
        items: [],
      },
      recruitmentPool: [],
      lastRecruitmentTime: nowIso,
      lastPayrollTime: nowIso,
      reviews: [],
      activeOrders: [],
      ordersCompleted: 0,
      ordersFailed: 0,

      // Compatibility (legacy fields used by some UI)
      name,
      balance: startingCapital,
      valuation: startingCapital,
      category: selectedType.name,
      phase: 'Startup',
      cashflow: 0,
      employeeCount: 1,
      founded: nowIso,

      // Status
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // ATOMIC BATCH OPERATION
    const batch = adminDb.batch();

    // Create business document
    batch.set(adminDb.collection('businesses').doc(newBizId), businessData);

    // Update user document atomically
    batch.update(userRef, {
      hasBusiness: true,
      businessID: newBizId,
      xp: FieldValue.increment(100),
      bCoins: FieldValue.increment(-250), // Deduct registration cost
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Commit all operations atomically - all succeed or all fail
    await batch.commit();

    return NextResponse.json({
      success: true,
      business: businessData,
      businessId: newBizId
    });

  } catch (error: any) {
    console.error('Registration Error');

    // Better error handling for specific cases
    if (error.code === 'permission-denied') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    if (error.code === 'resource-exhausted') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
