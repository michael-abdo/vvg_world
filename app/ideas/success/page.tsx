'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Home, FileText } from 'lucide-react';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const ideaId = searchParams.get('id');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Thank You!
          </h1>
          <p className="text-gray-600 mb-6">
            Your pain point has been successfully submitted. We appreciate your contribution to making VVG better!
          </p>

          {/* Submission ID */}
          {ideaId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Submission ID</p>
              <p className="font-mono text-sm text-gray-700">{ideaId}</p>
            </div>
          )}

          {/* What happens next */}
          <div className="text-left bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                Your pain point will be reviewed by our team
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                We'll categorize and route it to the appropriate department
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                You can track its progress on your division's landing page
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/ideas" className="block">
              <Button className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Submit Another Pain Point
              </Button>
            </Link>
            <Link href="/submissions" className="block">
              <Button variant="secondary" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                View All Submissions
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}