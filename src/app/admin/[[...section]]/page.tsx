import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { AdminDashboard } from '@/components/admin-dashboard';
import { AdminEntity } from '@/lib/admin-config';
export const dynamic = 'force-dynamic';
export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') redirect('/');
  const { section } = await params;
  const view = section?.[0] ?? 'overview';
  if (
    (section?.length ?? 0) > 1 ||
    !['overview', 'routes', 'stops', 'drivers', 'buses', 'users', 'history'].includes(view)
  )
    notFound();
  return <AdminDashboard view={view as AdminEntity | 'overview' | 'history'} />;
}
