export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simplified layout - no client-side auth checks per 2025 industry standards
  // Authentication is handled server-side in the Data Access Layer (lib/dal.ts)
  // This prevents client-side auth bypass vulnerabilities
  return (
    <div className="dashboard-layout">
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}