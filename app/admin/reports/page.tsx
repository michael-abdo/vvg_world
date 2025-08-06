'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Download, TrendingUp, Users, Target, Award } from 'lucide-react';

// Mock data for charts
const submissionTrends = [
  { month: 'Jan', submissions: 45, approved: 32, rejected: 8, pending: 5 },
  { month: 'Feb', submissions: 52, approved: 38, rejected: 9, pending: 5 },
  { month: 'Mar', submissions: 48, approved: 35, rejected: 7, pending: 6 },
  { month: 'Apr', submissions: 61, approved: 44, rejected: 10, pending: 7 },
  { month: 'May', submissions: 55, approved: 40, rejected: 9, pending: 6 },
  { month: 'Jun', submissions: 67, approved: 48, rejected: 12, pending: 7 },
  { month: 'Jul', submissions: 72, approved: 52, rejected: 13, pending: 7 },
  { month: 'Aug', submissions: 58, approved: 42, rejected: 10, pending: 6 }
];

const departmentData = [
  { department: 'Engineering', ideas: 89, implemented: 65, successRate: 73 },
  { department: 'Product', ideas: 67, implemented: 45, successRate: 67 },
  { department: 'HR', ideas: 34, implemented: 28, successRate: 82 },
  { department: 'Marketing', ideas: 45, implemented: 32, successRate: 71 },
  { department: 'Sales', ideas: 23, implemented: 18, successRate: 78 },
  { department: 'Operations', ideas: 56, implemented: 41, successRate: 73 }
];

const successRateData = [
  { quarter: 'Q1 2023', rate: 68, total: 145, implemented: 99 },
  { quarter: 'Q2 2023', rate: 71, total: 167, implemented: 119 },
  { quarter: 'Q3 2023', rate: 74, total: 189, implemented: 140 },
  { quarter: 'Q4 2023', rate: 76, total: 201, implemented: 153 },
  { quarter: 'Q1 2024', rate: 78, total: 223, implemented: 174 },
  { quarter: 'Q2 2024', rate: 75, total: 234, implemented: 176 }
];

const insights = [
  {
    title: "Peak Submission Period",
    description: "July shows the highest submission volume with 72 ideas",
    impact: "high",
    recommendation: "Increase reviewer capacity during summer months"
  },
  {
    title: "HR Department Excellence",
    description: "HR maintains the highest implementation success rate at 82%",
    impact: "medium", 
    recommendation: "Share HR's best practices with other departments"
  },
  {
    title: "Growing Engagement",
    description: "25% increase in submissions compared to last quarter",
    impact: "high",
    recommendation: "Prepare for increased review workload"
  }
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('6m');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Last Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-3xl font-bold">438</p>
                <p className="text-sm text-green-600">+12.3% from last period</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold">75%</p>
                <p className="text-sm text-green-600">+3.2% from last period</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Contributors</p>
                <p className="text-3xl font-bold">156</p>
                <p className="text-sm text-green-600">+8.7% from last period</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Implemented</p>
                <p className="text-3xl font-bold">329</p>
                <p className="text-sm text-green-600">+15.4% from last period</p>
              </div>
              <Award className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Submission Trends</TabsTrigger>
          <TabsTrigger value="departments">By Department</TabsTrigger>
          <TabsTrigger value="success">Success Rate</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submission Trends Over Time</CardTitle>
              <CardDescription>Monthly submission volume and status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={submissionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="submissions" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.8} />
                  <Area type="monotone" dataKey="approved" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.8} />
                  <Area type="monotone" dataKey="rejected" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.8} />
                  <Area type="monotone" dataKey="pending" stackId="2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Department</CardTitle>
              <CardDescription>Ideas submitted and implementation success by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ideas" fill="#3b82f6" name="Total Ideas" />
                  <Bar dataKey="implemented" fill="#10b981" name="Implemented" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="success" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Success Rate</CardTitle>
              <CardDescription>Quarterly success rate trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={successRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => name === 'rate' ? [`${value}%`, 'Success Rate'] : [value, name]} />
                  <Legend />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} name="Success Rate %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg">{insight.title}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                      insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {insight.impact.toUpperCase()}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{insight.description}</p>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">Recommendation:</p>
                    <p className="text-sm text-blue-800">{insight.recommendation}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}