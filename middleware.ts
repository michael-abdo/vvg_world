import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simplified middleware - no authentication logic per 2025 industry standards
// Authentication is now handled in the Data Access Layer (lib/dal.ts)
// to avoid CVE-2025-29927 middleware vulnerabilities
export default function middleware(request: NextRequest) {
  // Basic middleware for request processing only
  return NextResponse.next();
}

// Remove middleware matcher - authentication is now handled in DAL
// This prevents the CVE-2025-29927 vulnerability where middleware
// can be bypassed with x-middleware-subrequest header
export const config = {
  matcher: []
};