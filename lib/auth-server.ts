import { adminAuth } from './firebase-admin';
import { NextRequest } from 'next/server';

export class AuthError extends Error {
    constructor(message: string, public code: string = 'AUTH_ERROR') {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * Validates the Firebase ID Token from the Authorization header.
 * Returns the decoded token (including UID) or throws an AuthError.
 * 
 * @throws {AuthError} If token is missing, malformed, or invalid
 */
export async function verifyAuth(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // console.warn("[Auth] Missing or malformed Authorization header");
        throw new AuthError('Unauthorized: Missing or malformed token', 'MISSING_TOKEN');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        throw new AuthError('Unauthorized: Empty token', 'EMPTY_TOKEN');
    }

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        return decodedToken;
    } catch (error: any) {
        console.error("[Auth] Token verification failed:", error.code || error.message);
        throw new AuthError('Unauthorized: Invalid token', 'INVALID_TOKEN');
    }
}

/**
 * Helper to get user decoding without throwing.
 * Useful for optional authentication (e.g. public routes with personalized data).
 * @returns Decoded token or null if not authenticated
 */
export async function getUser(request: NextRequest) {
    try {
        return await verifyAuth(request);
    } catch (error) {
        return null; // Return null instead of throwing
    }
}
