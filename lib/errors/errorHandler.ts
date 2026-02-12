import { NextResponse } from 'next/server';
import { AppError } from './AppError';

export function errorHandler(err: unknown) {
    if (err instanceof AppError) {
        return NextResponse.json(
            { success: false, message: err.message, code: err.code },
            { status: err.statusCode }
        );
    }

    // Handle Firebase Auth errors if they occur
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthError') {
        const authErr = err as { message: string; code?: string };
        return NextResponse.json(
            { success: false, message: authErr.message, code: authErr.code || 'AUTH_ERROR' },
            { status: 401 }
        );
    }

    // Handle generic errors
    console.error('[Unhandled Error]', err);
    return NextResponse.json(
        { success: false, message: "Internal Server Error", code: "INTERNAL_ERROR" },
        { status: 500 }
    );
}
