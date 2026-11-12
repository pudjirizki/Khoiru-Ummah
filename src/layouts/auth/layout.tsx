import React, { ReactNode } from 'react';
// _common
import Topbar from '../_common/topbar';

// ----------------------------------------------------------------------

interface AuthLayoutProps {
  children: ReactNode;
}

// ----------------------------------------------------------------------

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }: AuthLayoutProps) => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-100 px-4 py-10 font-inter 2xl:container dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="absolute left-[-120px] top-[-120px] h-64 w-64 rounded-full bg-primary-2/20 blur-3xl" />
      <div className="absolute bottom-[-120px] right-[-120px] h-72 w-72 rounded-full bg-primary-1/15 blur-3xl" />

      <Topbar />

      <section id="auth-layout-children" className="min-h-screen px-7 pb-[50px] pt-[120px] md:px-10">
        {children}
      </section>
    </main>
  );
};

export default AuthLayout;
