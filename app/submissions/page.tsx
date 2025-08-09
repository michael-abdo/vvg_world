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

// Mock data for submissions
const mockSubmissions = [
  {
    id: '1',
    name: 'Sarah Johnson',
    department: 'Van Life',
    location: 'Warehouse - Dallas',
    category: 'Efficiency',
    description: 'Implement automated sorting system for incoming packages to reduce manual labor by 40%',
    status: 'Under Review',
    votes: 12,
    submittedAt: '2025-08-05T10:30:00Z',
  },
  {
    id: '2',
    name: 'Mike Chen',
    department: 'Transportation',
    location: 'Headquarters - Austin',
    category: 'Safety',
    description: 'Install blind spot cameras on all delivery vehicles to prevent accidents',
    status: 'In Progress',
    votes: 28,
    submittedAt: '2025-08-04T14:15:00Z',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    department: 'Customer Service',
    location: 'Office - New York',
    category: 'Cost Savings',
    description: 'Create AI chatbot for common customer inquiries to reduce call center load',
    status: 'Implemented',
    votes: 45,
    submittedAt: '2025-08-03T09:45:00Z',
  },
  {
    id: '4',
    name: 'James Wilson',
    department: 'Fulfillment',
    location: 'Warehouse - Houston',
    category: 'Quality',
    description: 'Double-check system for high-value orders to reduce shipping errors',
    status: 'Under Review',
    votes: 8,
    submittedAt: '2025-08-02T16:20:00Z',
  },
  {
    id: '5',
    name: 'Lisa Park',
    department: 'Engineering',
    location: 'Headquarters - Austin',
    category: 'Efficiency',
    description: 'Develop mobile app for drivers to optimize delivery routes in real-time',
    status: 'In Progress',
    votes: 35,
    submittedAt: '2025-08-01T11:00:00Z',
  },
];

const statusConfig = {
  'Under Review': { color: 'secondary', icon: Clock },
  'In Progress': { color: 'default', icon: ArrowUpDown },
  'Implemented': { color: 'success', icon: CheckCircle2 },
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState(mockSubmissions);
  const [filteredSubmissions, setFilteredSubmissions] = useState(mockSubmissions);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [votedIdeas, setVotedIdeas] = useState<Set<string>>(new Set());

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

  const handleVote = (id: string) => {
    console.log('Vote clicked for id:', id);
    console.log('Current voted ideas:', Array.from(votedIdeas));
    
    if (votedIdeas.has(id)) {
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
          sub.id === id ? { ...sub, votes: sub.votes - 1 } : sub
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
      </div>
    </div>
  );
}