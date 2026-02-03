import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';
import { assignSpecialization, initializeEmployeeSkills } from '@/lib/economy/employee-skills';
import { Employee } from '@/lib/economy/economy-types';

const EmployeeActionSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  action: z.enum(['hire', 'decline', 'pay', 'pay_all', 'fire', 'assign_specialization']),
  candidateId: z.string().optional(),
  employeeId: z.string().optional(),
  specialization: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const limiter = rateLimit(request, 120, 60000, 'business:employees:POST');
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const decodedToken = await verifyAuth(request);
    const body = await request.json();

    const result = EmployeeActionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request data', details: result.error.format() }, { status: 400 });
    }

    const { businessId, action, candidateId, employeeId, specialization } = result.data;

    const businessRef = adminDb.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();

    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const data = businessSnap.data() || {};
    if (data.ownerId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const employees: Employee[] = Array.isArray(data.employees) ? data.employees : [];
    const recruitmentPool: Employee[] = Array.isArray(data.recruitmentPool) ? data.recruitmentPool : [];
    const cashBalance = Number(data.cashBalance ?? data.balance ?? 0);
    const FieldValue = admin.firestore.FieldValue;
    const nowIso = new Date().toISOString();

    switch (action) {
      case 'hire': {
        if (!candidateId) {
          return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
        }
        const candidate = recruitmentPool.find((c) => c.id === candidateId);
        if (!candidate) {
          return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
        }

        const hiringCost = Math.floor((candidate.salaryPerDay || 0) * 1);
        if (cashBalance < hiringCost) {
          return NextResponse.json({ error: 'Insufficient funds for hiring deposit' }, { status: 400 });
        }

        const employeeRecord: Employee = {
          ...candidate,
          unpaidWages: 0,
          hiredAt: nowIso,
          stats: {
            speed: candidate.stats?.speed ?? 50,
            quality: candidate.stats?.quality ?? 50,
            morale: 100
          },
          skills:
            candidate.skills && Object.keys(candidate.skills).length > 0
              ? candidate.skills
              : initializeEmployeeSkills(candidate.role)
        };

        const updatedPool = recruitmentPool.filter((c) => c.id !== candidateId);
        const updatedEmployees = [...employees, employeeRecord];

        await businessRef.update({
          employees: updatedEmployees,
          recruitmentPool: updatedPool,
          staffCount: FieldValue.increment(1),
          cashBalance: FieldValue.increment(-hiringCost),
          balance: FieldValue.increment(-hiringCost),
          updatedAt: nowIso
        });

        return NextResponse.json({ success: true, employee: employeeRecord });
      }

      case 'decline': {
        if (!candidateId) {
          return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
        }

        const updatedPool = recruitmentPool.filter((c) => c.id !== candidateId);
        await businessRef.update({ recruitmentPool: updatedPool, updatedAt: nowIso });
        return NextResponse.json({ success: true });
      }

      case 'pay': {
        if (!employeeId) {
          return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
        }

        const employee = employees.find((e) => e.id === employeeId);
        if (!employee) {
          return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const wage = Number(employee.unpaidWages ?? 0);
        if (wage <= 0) {
          return NextResponse.json({ error: 'No wages due' }, { status: 400 });
        }

        if (cashBalance < wage) {
          return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
        }

        const updatedEmployees = employees.map((e) =>
          e.id === employeeId
            ? {
                ...e,
                unpaidWages: 0,
                stats: {
                  ...e.stats,
                  morale: Math.min(100, (e.stats?.morale ?? 0) + 10)
                }
              }
            : e
        );

        await businessRef.update({
          employees: updatedEmployees,
          cashBalance: FieldValue.increment(-wage),
          balance: FieldValue.increment(-wage),
          updatedAt: nowIso
        });

        return NextResponse.json({ success: true, paid: wage });
      }

      case 'pay_all': {
        const totalOwed = employees.reduce((sum, e) => sum + (e.unpaidWages || 0), 0);
        if (totalOwed <= 0) {
          return NextResponse.json({ success: true, paid: 0 });
        }

        if (cashBalance < totalOwed) {
          return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
        }

        const updatedEmployees = employees.map((e) => ({
          ...e,
          unpaidWages: 0,
          stats: {
            ...e.stats,
            morale: Math.min(100, (e.stats?.morale ?? 0) + 12)
          }
        }));

        await businessRef.update({
          employees: updatedEmployees,
          cashBalance: FieldValue.increment(-totalOwed),
          balance: FieldValue.increment(-totalOwed),
          updatedAt: nowIso
        });

        return NextResponse.json({ success: true, paid: totalOwed });
      }

      case 'fire': {
        if (!employeeId) {
          return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
        }

        const employee = employees.find((e) => e.id === employeeId);
        if (!employee) {
          return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const updatedEmployees = employees.filter((e) => e.id !== employeeId);
        const nextStaffCount = Math.max(0, Number(data.staffCount ?? employees.length) - 1);

        await businessRef.update({
          employees: updatedEmployees,
          staffCount: nextStaffCount,
          updatedAt: nowIso
        });

        return NextResponse.json({ success: true });
      }

      case 'assign_specialization': {
        if (!employeeId || !specialization) {
          return NextResponse.json({ error: 'employeeId and specialization are required' }, { status: 400 });
        }

        const employee = employees.find((e) => e.id === employeeId);
        if (!employee) {
          return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const updatedEmployee = assignSpecialization(employee, specialization as any);
        const updatedEmployees = employees.map((e) => (e.id === employeeId ? updatedEmployee : e));

        await businessRef.update({ employees: updatedEmployees, updatedAt: nowIso });
        return NextResponse.json({ success: true, employee: updatedEmployee });
      }

      default:
        return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Employee action error:', error);
    return NextResponse.json({ error: 'Failed to process employee action' }, { status: 500 });
  }
}
