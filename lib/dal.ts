import { cache } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { pagePath } from '@/lib/utils/path-utils';
import type { Session } from 'next-auth';

// Mock session for development when DISABLE_AUTH=true
const mockSession: Session = {
  user: {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: '2099-01-01T00:00:00.Z',
};

/**
 * Verify session - Single point of truth for authentication
 * Following 2025 industry standards: Data Access Layer as primary defense
 * 
 * This centralizes all authentication logic in one place, avoiding:
 * - CVE-2025-29927 middleware vulnerability
 * - Redundant auth checks across components
 * - Client-side auth bypass vulnerabilities
 */
export const verifySession = cache(async (): Promise<Session> => {
  // Development bypass - single configuration point
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
    return mockSession;
  }

  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect(pagePath('/sign-in'));
  }

  return session;
});