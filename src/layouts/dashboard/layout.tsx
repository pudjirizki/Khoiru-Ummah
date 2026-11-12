import React, { ReactNode, useEffect, useState } from 'react';
// routes
import { paths } from '/src/routes/paths';
import { usePathname, useRouter } from '/src/routes/hooks';
// hooks
import { useDatabaseUser } from '/src/hooks/use-database-user';
//
import Topbar from './topbar';
import Sidebar from './sidebar';

// ----------------------------------------------------------------------

interface DashboardLayoutProps {
  children: ReactNode;
}

// ----------------------------------------------------------------------

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }: DashboardLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isLoadingUser } = useDatabaseUser();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const accessToken = sessionStorage.getItem('accessToken');

  useEffect(() => {
    if (isLoadingUser) return;

    if (accessToken && currentUser && !currentUser.databaseUsers?.role && pathname !== paths.dashboard.profile.root) {
      router.replace(paths.dashboard.profile.root);
    }
  }, [accessToken, currentUser, isLoadingUser, pathname, router]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-800">
      <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && <button type="button" aria-label="Close sidebar overlay" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-[990] bg-slate-950/50 backdrop-blur-[2px] lg:hidden" />}

      <section id="dashboard-layout-children" className="min-h-screen px-4 pb-10 pt-[104px] sm:px-6 md:px-8 lg:ml-[284px] lg:px-10">
        {children}
      </section>
    </main>
  );
};

export default DashboardLayout;
