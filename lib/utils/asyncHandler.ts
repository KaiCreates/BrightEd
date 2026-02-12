import { NextRequest, NextResponse } from 'next/server';
import { errorHandler } from '../errors/errorHandler';

type NextHandler = (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>;

export const asyncHandler = (fn: NextHandler) =>
    async (req: NextRequest, ...args: unknown[]) => {
        try {
            return await fn(req, ...args);
        } catch (error) {
            return errorHandler(error);
        }
    };
