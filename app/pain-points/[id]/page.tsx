'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, ThumbsUp, ThumbsDown, Calendar, User, MapPin, Building, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

// API Types
interface PainPoint {
  id: number;
  title: string;
  description: string;
  category: 'Safety' | 'Efficiency' | 'Cost Savings' | 'Quality' | 'Other';
  submitted_by: string;
  department?: string;
  location?: string;
  status: 'pending' | 'under_review' | 'in_progress' | 'completed' | 'rejected';
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
}

// API functions
const fetchPainPointById = async (id: number): Promise<PainPoint | null> => {
  try {
    const response = await fetch(`/api/pain-points/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch pain point');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching pain point:', error);
    return null;
  }
};

const votePainPoint = async (id: number, voteType: 'up' | 'down', userEmail: string): Promise<PainPoint | null> => {
  try {
    const response = await fetch(`/api/pain-points/${id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vote_type: voteType,
        userEmail: userEmail,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to vote');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error voting:', error);
    return null;
  }
};

// Helper functions
const getNameFromEmail = (email: string): string => {
  const name = email.split('@')[0];
  return name.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const statusConfig = {
  'pending': { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Clock, 
    label: 'Pending Review' 
  },
  'under_review': { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: AlertCircle, 
    label: 'Under Review' 
  },
  'in_progress': { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: Clock, 
    label: 'In Progress' 
  },
  'completed': { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle2, 
    label: 'Completed' 
  },
  'rejected': { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: AlertCircle, 
    label: 'Rejected' 
  },
};

const categoryColors = {
  'Safety': 'bg-red-50 text-red-700 border-red-200',
  'Efficiency': 'bg-blue-50 text-blue-700 border-blue-200',
  'Cost Savings': 'bg-green-50 text-green-700 border-green-200',
  'Quality': 'bg-purple-50 text-purple-700 border-purple-200',
  'Other': 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function PainPointDetailPage() {
  const params = useParams();
  const router = useRouter();
  const painPointId = parseInt(params.id as string);
  
  const [painPoint, setPainPoint] = useState<PainPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    const loadPainPoint = async () => {
      if (!painPointId || isNaN(painPointId)) {
        setError('Invalid pain point ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await fetchPainPointById(painPointId);
      if (data) {
        setPainPoint(data);
      } else {
        setError('Pain point not found');
      }
      setLoading(false);
    };

    loadPainPoint();
  }, [painPointId]);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!painPoint || voting) return;

    setVoting(true);
    // For now, use a dummy email since auth is required
    const userEmail = 'test.user@vvg.com';
    const result = await votePainPoint(painPoint.id, voteType, userEmail);
    
    if (result) {
      setPainPoint(result);
    } else {
      alert('Voting requires authentication. Please sign in to vote.');
    }
    setVoting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pain point...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !painPoint) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pain Point Not Found</h3>
            <p className="text-gray-600 mb-4">{error || 'The pain point you are looking for does not exist.'}</p>
            <Link href="/submissions">
              <Button>Back to All Submissions</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[painPoint.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/submissions">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to All Submissions
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Pain Point Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{painPoint.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4 text-base">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {getNameFromEmail(painPoint.submitted_by)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(painPoint.created_at)}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {painPoint.description}
                </p>
              </CardContent>
            </Card>

            {/* Voting Section */}
            <Card>
              <CardHeader>
                <CardTitle>Community Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => handleVote('up')}
                    disabled={voting}
                    variant="outline"
                    className="gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Helpful ({painPoint.upvotes})
                  </Button>
                  <Button
                    onClick={() => handleVote('down')}
                    disabled={voting}
                    variant="outline"
                    className="gap-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Not Helpful ({painPoint.downvotes})
                  </Button>
                  {voting && (
                    <span className="text-sm text-gray-500">Processing...</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Help others by voting on the relevance and importance of this pain point.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Category */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Status</label>
                  <Badge className={`${statusInfo.color} flex items-center gap-1 w-fit`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusInfo.label}
                  </Badge>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Category</label>
                  <Badge className={`${categoryColors[painPoint.category]} border w-fit`}>
                    {painPoint.category}
                  </Badge>
                </div>

                {painPoint.department && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Department</label>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Building className="h-4 w-4" />
                      {painPoint.department}
                    </div>
                  </div>
                )}

                {painPoint.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Location</label>
                    <div className="flex items-center gap-1 text-gray-700">
                      <MapPin className="h-4 w-4" />
                      {painPoint.location}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Last Updated</label>
                  <div className="text-sm text-gray-600">
                    {formatDate(painPoint.updated_at)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/ideas" className="block">
                  <Button className="w-full gap-2" variant="outline">
                    Submit Similar Pain Point
                  </Button>
                </Link>
                <Link href="/admin/ideas" className="block">
                  <Button className="w-full gap-2" variant="outline">
                    Admin Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}