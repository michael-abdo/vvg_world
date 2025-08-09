'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, Filter, Lightbulb, Search, ThumbsUp, Clock, CheckCircle2 } from 'lucide-react';

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

// API fetch function
const fetchPainPoints = async (): Promise<PainPoint[]> => {
  try {
    const response = await fetch('/api/pain-points');
    if (!response.ok) {
      throw new Error('Failed to fetch pain points');
    }
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching pain points:', error);
    return [];
  }
};

// API voting function
const voteOnPainPoint = async (id: number, voteType: 'up' | 'down'): Promise<PainPoint | null> => {
  try {
    const response = await fetch(`/api/pain-points/${id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vote_type: voteType,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to vote');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error voting:', error);
    throw error;
  }
};

// Mock data removed - using real API data

const statusConfig = {
  'pending': { color: 'secondary', icon: Clock, label: 'Pending' },
  'under_review': { color: 'secondary', icon: Clock, label: 'Under Review' },
  'in_progress': { color: 'default', icon: ArrowUpDown, label: 'In Progress' },
  'completed': { color: 'success', icon: CheckCircle2, label: 'Completed' },
  'rejected': { color: 'destructive', icon: Clock, label: 'Rejected' },
};

// Helper function to extract name from email
const getNameFromEmail = (email: string): string => {
  const name = email.split('@')[0];
  return name.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
};

// Helper function to convert API data to display format
const convertPainPointToSubmission = (painPoint: PainPoint) => ({
  id: painPoint.id.toString(),
  name: getNameFromEmail(painPoint.submitted_by),
  department: painPoint.department || 'Unknown',
  location: painPoint.location || 'Unknown',
  category: painPoint.category,
  description: painPoint.description,
  status: statusConfig[painPoint.status]?.label || painPoint.status,
  votes: painPoint.upvotes + painPoint.downvotes,
  submittedAt: painPoint.created_at,
});

export default function SubmissionsPage() {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [votedIdeas, setVotedIdeas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<Set<string>>(new Set());

  // Fetch pain points data on component mount
  useEffect(() => {
    const loadPainPoints = async () => {
      console.log('Loading pain points...');
      setLoading(true);
      const data = await fetchPainPoints();
      console.log('Fetched pain points:', data);
      setPainPoints(data);
      const converted = data.map(convertPainPointToSubmission);
      console.log('Converted submissions:', converted);
      setSubmissions(converted);
      setLoading(false);
    };
    loadPainPoints();
  }, []);

  // Filter and sort submissions
  useEffect(() => {
    let filtered = [...submissions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (sub) =>
          sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((sub) => sub.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        case 'oldest':
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        case 'votes':
          return b.votes - a.votes;
        default:
          return 0;
      }
    });

    setFilteredSubmissions(filtered);
  }, [submissions, searchTerm, categoryFilter, sortBy]);

  const handleVote = async (id: string) => {
    console.log('Vote clicked for id:', id);
    
    // Prevent multiple votes on same item
    if (voting.has(id)) {
      console.log('Already voting on id:', id);
      return;
    }
    
    // Check if already voted (toggle behavior)
    const alreadyVoted = votedIdeas.has(id);
    const voteType = alreadyVoted ? 'down' : 'up'; // If already voted, this is an "unvote" (down vote)
    
    // Set voting state
    setVoting(prev => new Set(prev).add(id));
    
    try {
      console.log(`${alreadyVoted ? 'Unvoting' : 'Voting'} for id: ${id} with type: ${voteType}`);
      
      // Try to vote via API
      const updatedPainPoint = await voteOnPainPoint(parseInt(id), voteType);
      
      if (updatedPainPoint) {
        console.log('Vote successful, updated pain point:', updatedPainPoint);
        
        // Update the pain points data with new vote counts
        setPainPoints(prev => 
          prev.map(p => p.id === updatedPainPoint.id ? updatedPainPoint : p)
        );
        
        // Update submissions display data
        setSubmissions(prev =>
          prev.map(sub =>
            sub.id === id 
              ? { ...sub, votes: updatedPainPoint.upvotes + updatedPainPoint.downvotes }
              : sub
          )
        );
        
        // Toggle voted state
        setVotedIdeas(prev => {
          const newSet = new Set(prev);
          if (alreadyVoted) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return newSet;
        });
        
        console.log('Vote completed successfully');
      }
    } catch (error: any) {
      console.error('Voting failed:', error);
      
      // Show user-friendly message
      if (error.message.includes('Authentication required')) {
        alert('Please sign in to vote on pain points. Voting requires authentication.');
      } else {
        alert('Failed to vote. Please try again.');
      }
    } finally {
      // Clear voting state
      setVoting(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Submissions</h1>
          <p className="text-gray-600">
            Browse and vote on ideas from across VVG
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search ideas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Safety">Safety</SelectItem>
                <SelectItem value="Efficiency">Efficiency</SelectItem>
                <SelectItem value="Cost Savings">Cost Savings</SelectItem>
                <SelectItem value="Quality">Quality</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="votes">Most Votes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-600 mb-4">
          Showing {filteredSubmissions.length} of {submissions.length} submissions
        </p>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pain points...</p>
          </div>
        )}

        {/* Submissions Grid */}
        {!loading && (
          <div className="grid gap-4">
            {filteredSubmissions.map((submission) => {
              // Find the matching pain point to get real status
              const painPoint = painPoints.find(p => p.id.toString() === submission.id);
              const statusKey = painPoint?.status || 'pending';
              const statusInfo = statusConfig[statusKey];
              const StatusIcon = statusInfo?.icon || Clock;
            return (
              <Card key={submission.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{submission.name}</CardTitle>
                      <CardDescription>
                        {submission.department} • {submission.location}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={statusInfo?.color as any}
                      className="flex items-center gap-1"
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo?.label || statusKey}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{submission.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <Badge variant="outline">{submission.category}</Badge>
                      <span>
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleVote(submission.id)}
                      disabled={voting.has(submission.id)}
                      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 rounded-md px-3 ${
                        votedIdeas.has(submission.id) 
                          ? "bg-green-600 hover:bg-green-700 text-white border border-green-600" 
                          : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {voting.has(submission.id) ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <ThumbsUp className={`h-4 w-4 ${
                          votedIdeas.has(submission.id) ? "fill-white" : ""
                        }`} />
                      )}
                      {submission.votes}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}

        {/* Empty State */}
        {!loading && filteredSubmissions.length === 0 && (
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No submissions found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
            <Link href="/ideas">
              <Button>Submit the First Idea</Button>
            </Link>
          </div>
        )}

        {/* Submit Idea CTA */}
        {!loading && filteredSubmissions.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/ideas">
              <Button size="lg" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Submit Your Own Idea
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}