// import { ProtectedRoute } from '@/lib/auth-provider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      // <ProtectedRoute>
        children
      // </ProtectedRoute>
  );
}
