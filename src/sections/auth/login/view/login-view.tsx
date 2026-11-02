import React from 'react';
//
import LoginForm from '../login-form';

// ----------------------------------------------------------------------

const LoginView: React.FC = () => {
  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:flex-row">
      <div className="flex flex-1 flex-col justify-between bg-gradient-to-br from-primary-3 via-primary-1 to-primary-2 p-8 text-white md:p-12">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-white" />
            Selamat Datang
          </div>

          <h1 className="max-w-md font-poppins text-3xl font-bold leading-tight md:text-5xl">Selamat Datang Kembali</h1>

          <p className="mt-5 max-w-md text-base leading-7 text-white/90">Masuk ke akun Anda untuk melanjutkan aktivitas dan mengakses seluruh fitur yang tersedia.</p>
        </div>

        <div className="mt-10 space-y-4">
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <p className="font-semibold">📊 Monitoring Data</p>
            <p className="mt-1 text-sm text-white/80">Lihat ringkasan dan perkembangan data secara real-time.</p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <p className="font-semibold">📝 Pengelolaan Mudah</p>
            <p className="mt-1 text-sm text-white/80">Kelola informasi dengan proses yang lebih terstruktur.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/60 md:p-8">
          <div className="mb-8">
            <p className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-primary-3">Welcome back</p>
            <h2 className="mt-4 font-poppins text-3xl font-bold text-slate-900">Masuk ke akun</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Silakan masukkan email dan kata sandi untuk melanjutkan.</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </section>
  );
};

export default LoginView;
