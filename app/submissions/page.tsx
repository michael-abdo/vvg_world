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
import { ArrowUpDown, Filter, Lightbulb, Search, ThumbsUp, Clock, CheckCircle2, Loader2 } from 'lucide-react';


const statusConfig = {
  'Under Review': { color: 'secondary', icon: Clock },
  'In Progress': { color: 'default', icon: ArrowUpDown },
  'Implemented': { color: 'success', icon: CheckCircle2 },
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [votedIdeas, setVotedIdeas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch submissions from API
  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching submissions from API...');
      
      const response = await fetch('/api/submissions');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      if (data.success) {
        setSubmissions(data.submissions || []);
        console.log(`Loaded ${data.submissions?.length || 0} submissions from database`);
      } else {
        throw new Error(data.error || 'Failed to fetch submissions');
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
      // Fallback to empty array instead of mock data
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load submissions on component mount
  useEffect(() => {
    fetchSubmissions();
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
    console.log('Current voted ideas:', Array.from(votedIdeas));
    
    const isVoted = votedIdeas.has(id);
    const action = isVoted ? 'remove' : 'add';
    
    try {
      // Optimistic UI update
      if (isVoted) {
        // Unvote
        console.log('Unvoting id:', id);
        setVotedIdeas((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          console.log('New voted ideas after unvote:', Array.from(newSet));
          return newSet;
        });
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === id ? { ...sub, votes: Math.max(sub.votes - 1, 0) } : sub
          )
        );
      } else {
        // Vote
        console.log('Voting for id:', id);
        setVotedIdeas((prev) => {
          const newSet = new Set(prev).add(id);
          console.log('New voted ideas after vote:', Array.from(newSet));
          return newSet;
        });
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === id ? { ...sub, votes: sub.votes + 1 } : sub
          )
        );
      }

      // Call voting API endpoint
      const response = await fetch('/api/submissions/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          painPointId: id,
          userEmail: 'michael.abdo@vvg.com',
          voteType: 'up',
          action: action
        }),
      });

      const result = await response.json();
      console.log('Vote API response:', result);

      if (!result.success) {
        // Revert optimistic update on failure
        console.error('Vote failed, reverting changes');
        if (isVoted) {
          setVotedIdeas((prev) => new Set(prev).add(id));
          setSubmissions((prev) =>
            prev.map((sub) =>
              sub.id === id ? { ...sub, votes: sub.votes + 1 } : sub
            )
          );
        } else {
          setVotedIdeas((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
          setSubmissions((prev) =>
            prev.map((sub) =>
              sub.id === id ? { ...sub, votes: Math.max(sub.votes - 1, 0) } : sub
            )
          );
        }
      } else {
        // Update with actual vote count from server
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === id ? { ...sub, votes: result.votes || sub.votes } : sub
          )
        );
      }
      
    } catch (error) {
      console.error('Error processing vote:', error);
      // Revert optimistic update on error
      if (isVoted) {
        setVotedIdeas((prev) => new Set(prev).add(id));
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === id ? { ...sub, votes: sub.votes + 1 } : sub
          )
        );
      } else {
        setVotedIdeas((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === id ? { ...sub, votes: Math.max(sub.votes - 1, 0) } : sub
          )
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Submissions</h1>
          <p className="text-gray-600">
            Browse and vote on pain points from across VVG
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading submissions...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Submissions</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={fetchSubmissions} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Content - only show when not loading */}
        {!loading && (
          <>

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

        {/* Submissions Grid */}
        <div className="grid gap-4">
          {filteredSubmissions.map((submission) => {
            const StatusIcon = statusConfig[submission.status as keyof typeof statusConfig].icon;
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
                      variant={statusConfig[submission.status as keyof typeof statusConfig].color as any}
                      className="flex items-center gap-1"
                    >
                      <StatusIcon className="h-3 w-3" />
                      {submission.status}
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
                      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 rounded-md px-3 ${
                        votedIdeas.has(submission.id) 
                          ? "bg-green-600 hover:bg-green-700 text-white border border-green-600" 
                          : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <ThumbsUp className={`h-4 w-4 ${
                        votedIdeas.has(submission.id) ? "fill-white" : ""
                      }`} />
                      {submission.votes}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredSubmissions.length === 0 && (
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
        {filteredSubmissions.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/ideas">
              <Button size="lg" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Submit Your Own Idea
              </Button>
            </Link>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}