import { verifySession } from "@/lib/dal";
import DashboardClient from "./dashboard-client";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View your document processing statistics and recent activity',
};

export default async function Dashboard() {
  // Single authentication check using DAL - industry standard 2025
  const session = await verifySession();
  
  return <DashboardClient />;
}