// Dashboard and Reports TypeScript Interfaces

export interface SubmissionTrend {
  month: string;
  submissions: number;
  approved: number;
  rejected: number;
  pending: number;
}

export interface DepartmentAnalytics {
  department: string;
  ideas: number;
  implemented: number;
  successRate: number;
}

export interface SuccessRate {
  quarter: string;
  rate: number;
  total: number;
  implemented: number;
}

export interface KeyMetrics {
  totalSubmissions: number;
  successRate: number;
  activeContributors: number;
  implemented: number;
}

export interface ReportsData {
  submissionTrends: SubmissionTrend[];
  departmentData: DepartmentAnalytics[];
  successRateData: SuccessRate[];
  keyMetrics: KeyMetrics;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

// Admin Dashboard Types
export interface DashboardStats {
  totalIdeas: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  totalUsers: number;
  activeUsers: number;
}

export interface StatusData {
  name: string;
  value: number;
  color: string;
}

export interface CategoryData {
  name: string;
  count: number;
  color: string;
}

export interface RecentIdea {
  id: string;
  title: string;
  submitter: string;
  status: string;
  date: string;
  category: string;
}

export interface DashboardData {
  stats: DashboardStats;
  statusData: StatusData[];
  categoryData: CategoryData[];
  recentIdeas: RecentIdea[];
}