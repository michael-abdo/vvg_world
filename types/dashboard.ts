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