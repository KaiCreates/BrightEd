import { adminAuth } from './firebase-admin';
import { NextRequest } from 'next/server';

/**
 * Validates the Firebase ID Token from the Authorization header.
 * Returns the decoded token (including UID) or throws an error.
 */
export async function verifyAuth(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');

    // Debug logging to see exactly what reaches the server
    // console.log("Auth Header Received:", authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn("Missing or malformed Authorization header");
        throw new Error('Unauthorized: Missing or malformed token');
    }

    // Standardize splitting by space
    const token = authHeader.split(' ')[1];

    if (!token) {
        throw new Error('Unauthorized: Empty token');
    }

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        return decodedToken;
    } catch (error: any) {
        console.error("Firebase ID Token verification failed");
        throw new Error('Unauthorized: Invalid token');
    }
}
