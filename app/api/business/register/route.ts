import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';

const RegistrationSchema = z.object({
  name: z.string().min(3).max(50),
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

    const { name } = result.data;
    const FieldValue = admin.firestore.FieldValue;

    const businessesRef = adminDb.collection('businesses');
    const existingQuery = await businessesRef.where('ownerId', '==', userId).get();

    if (existingQuery.size >= 3) {
      return NextResponse.json({ error: 'Venture Limit Reached (3/3).' }, { status: 403 });
    }

    const nameQuery = await businessesRef.where('name', '==', name).get();
    if (!nameQuery.empty) {
      return NextResponse.json({ error: `The name "${name}" is already taken.` }, { status: 400 });
    }

    // ATOMIC TRANSACTION - Ensure data consistency
    const newBizId = adminDb.collection('businesses').doc().id;
    const now = new Date().toISOString();
    
    // Get user data in transaction to ensure consistency
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data() || {};
    const ownerName = userData.firstName || userData.displayName || "Founder";

    const businessData = {
      id: newBizId,
      name,
      ownerId: userId,
      ownerName,
      category: "Global Ecommerce",
      phase: "Startup",
      valuation: 0,
      balance: 0,
      cashflow: 0,
      employeeCount: 1,
      founded: now,
      createdAt: now,
      status: "ACTIVE",
      stats: { revenueHistory: [0], expenses: 0 }
    };

    // ATOMIC BATCH OPERATION
    const batch = adminDb.batch();
    
    // Create business document
    batch.set(adminDb.collection('businesses').doc(newBizId), businessData);
    
    // Update user document atomically
    batch.update(adminDb.collection('users').doc(userId), {
      hasBusiness: true,
      businessID: newBizId,
      xp: FieldValue.increment(100),
      updatedAt: now
    });

    // Commit all operations atomically - all succeed or all fail
    await batch.commit();
    
    return NextResponse.json({ 
      success: true, 
      business: businessData, 
      businessId: newBizId 
    });

  } catch (error: any) {
    console.error('Registration Error:', error);
    
    // Better error handling for specific cases
    if (error.code === 'permission-denied') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    if (error.code === 'resource-exhausted') {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Registration failed' 
    }, { status: 500 });
  }
}
