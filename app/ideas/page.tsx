'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';

// Form validation schema
const ideaFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  department: z.string().min(1, 'Please select a department'),
  location: z.string().min(1, 'Please select a location'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().min(10, 'Please provide a detailed description'),
  attachment: z.any().optional(),
});

type IdeaFormData = z.infer<typeof ideaFormSchema>;

// Mock data - replace with actual data from database
const departments = [
  'Van Life',
  'Transportation', 
  'Fulfillment',
  'Customer Service',
  'Engineering',
  'Sales',
  'Marketing',
  'Finance',
  'HR',
];

const locations = [
  'Headquarters - Austin',
  'Warehouse - Dallas',
  'Warehouse - Houston',
  'Warehouse - Phoenix',
  'Office - New York',
  'Office - Los Angeles',
];

const categories = [
  'Safety',
  'Efficiency',
  'Cost Savings',
  'Quality',
  'Other',
];

export default function IdeaSubmissionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<IdeaFormData>({
    resolver: zodResolver(ideaFormSchema),
  });

  const onSubmit = async (data: IdeaFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ideas/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit idea');
      }

      const result = await response.json();
      
      // Redirect to success page
      router.push(`/ideas/success?id=${result.id}`);
    } catch (error) {
      console.error('Failed to submit idea:', error);
      alert('Failed to submit your idea. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Submit Your Idea
          </h1>
          <p className="text-gray-600 mb-8">
            Share your innovative ideas to help make VVG even better. Every idea counts!
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter your name"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Department Field */}
            <div>
              <Label htmlFor="department">Department</Label>
              <Select onValueChange={(value) => setValue('department', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-sm text-red-600 mt-1">{errors.department.message}</p>
              )}
            </div>

            {/* Location Field */}
            <div>
              <Label htmlFor="location">Facility/Location</Label>
              <Select onValueChange={(value) => setValue('location', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location && (
                <p className="text-sm text-red-600 mt-1">{errors.location.message}</p>
              )}
            </div>

            {/* Idea Description */}
            <div>
              <Label htmlFor="description">What's your idea?</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Don't hold back! Describe your idea in detail..."
                className="mt-1 min-h-[120px]"
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Category Field */}
            <div>
              <Label htmlFor="category">How would you categorize this idea?</Label>
              <Select onValueChange={(value) => setValue('category', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* File Attachment (Optional) */}
            <div>
              <Label htmlFor="attachment">Attachment (Optional)</Label>
              <Input
                id="attachment"
                type="file"
                {...register('attachment')}
                className="mt-1"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: PDF, DOC, DOCX, PNG, JPG
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}