import React, { useEffect } from 'react';
import { Icon } from '@iconify/react';
// routes
import { paths } from '/src/routes/paths';
// hooks
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseStudent } from '/src/hooks/use-database-student';
// components
import { Button } from '/src/components/button';

// ----------------------------------------------------------------------

interface UserDetailViewProps {
  slug: string;
}

// ----------------------------------------------------------------------

const UserDetailView: React.FC<UserDetailViewProps> = ({ slug }) => {
  const { allUsersCache } = useDatabaseUser();

  const user = allUsersCache.find((u) => u.id === slug);

  const { students, studentsList } = useDatabaseStudent();

  // GET STUDENTS LIST
  useEffect(() => {
    students({ parentId: slug });
  }, [slug, students]);

  if (!user) return <p className="">Pengguna Tidak Ditemukan</p>;

  const totalStudent = studentsList.length;

  const InfoItem = ({ icon, title, value }: { icon: string; title: string; value: string }) => (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-1/10">
        <Icon icon={icon} width={20} className="text-primary-1" />
      </div>

      <div>
        <p className="text-sm text-slate-400">{title}</p>

        <p className="break-all font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );

  const SummaryCard = ({ title, value, icon }: { title: string; value: string; icon: string }) => (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>

          <h3 className="mt-2 text-xl font-bold text-slate-800">{value}</h3>
        </div>

        <div className="rounded-2xl bg-primary-1/10 p-4">
          <Icon icon={icon} width={28} className="text-primary-1" />
        </div>
      </div>
    </div>
  );

  const TimelineItem = ({ title, date, icon }: { title: string; date: string; icon: string }) => (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-1 text-white">
        <Icon icon={icon} width={18} />
      </div>

      <div>
        <p className="font-medium text-slate-800">{title}</p>

        <p className="text-sm text-slate-500">{date}</p>
      </div>
    </div>
  );

  const roleConfig = {
    admin: {
      label: 'Administrator',
      icon: 'solar:shield-user-bold',
      color: 'bg-violet-100 text-violet-600',
    },
    teacher: {
      label: 'Guru',
      icon: 'solar:book-bold',
      color: 'bg-sky-100 text-sky-600',
    },
    parent: {
      label: 'Wali Siswa',
      icon: 'solar:users-group-rounded-bold',
      color: 'bg-amber-100 text-amber-700',
    },
  }[user.role];

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const statusConfig = {
    active: {
      label: 'Aktif',
      color: 'bg-green-100 text-green-700',
    },
    inactive: {
      label: 'Tidak Aktif',
      color: 'bg-red-100 text-red-700',
    },
  }[user.status];

  return (
    <section>
      {/* HEADER */}
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <Button component="RouterLink" href={paths.dashboard.user.root} variant="gost" className="mb-8 flex w-fit items-center gap-2 text-slate-500 hover:text-primary-1">
          <Icon icon="ic:round-arrow-back-ios" width={18} />
          Kembali ke Daftar Pengguna
        </Button>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary-1 text-white shadow-lg">
              <Icon icon="solar:user-bold" width={46} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-poppins text-3xl font-bold text-slate-800">{user.name}</h1>

                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${roleConfig.color}`}>
                  <Icon icon={roleConfig.icon} width={16} />

                  {roleConfig.label}
                </span>
              </div>

              <div className="mt-5 flex flex-col gap-2 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Icon icon="solar:letter-bold" width={18} />

                  {user.email}
                </div>

                <div className="flex items-center gap-2">
                  <Icon icon="solar:phone-bold" width={18} />

                  {user.phoneNumber || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <SummaryCard title="Role" value={roleConfig.label} icon={roleConfig.icon} />

        <SummaryCard title="Status" value={statusConfig.label} icon="solar:shield-check-bold" />

        <SummaryCard title="Terdaftar" value={formatDate(user.createdAt)} icon="solar:calendar-bold" />

        {user.role === 'parent' && <SummaryCard title="Total Anak" value={String(totalStudent)} icon="solar:users-group-rounded-bold" />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* INFORMASI PENGGUNA */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-6 font-poppins text-xl font-semibold">Informasi Pengguna</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <InfoItem icon="solar:letter-bold" title="Email" value={user.email} />

            <InfoItem icon="solar:phone-bold" title="Nomor HP" value={user.phoneNumber || '-'} />

            <InfoItem icon="solar:user-id-bold" title="User ID" value={user.id} />

            <InfoItem icon="solar:calendar-bold" title="Tanggal Dibuat" value={formatDate(user.createdAt)} />
          </div>
        </div>

        {/* TIMELINE */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 font-poppins text-xl font-semibold">Aktivitas</h2>

          <div className="space-y-6">
            <TimelineItem title="Akun Dibuat" date={formatDate(user.createdAt)} icon="solar:add-circle-bold" />

            <TimelineItem title="Terakhir Diperbarui" date={formatDate(user.updatedAt)} icon="solar:pen-bold" />
          </div>
        </div>
      </div>

      {/* LIST ANAK (ROLE PARENT ONLY) */}
      {user.role === 'parent' && (
        <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-poppins text-xl font-semibold">Daftar Anak</h2>

            <span className="rounded-full bg-primary-1/10 px-4 py-2 text-sm font-semibold text-primary-1">{studentsList.length} Siswa</span>
          </div>

          <div className="space-y-4">
            {studentsList.map((student) => (
              <div key={student.id} className="group flex items-center justify-between rounded-2xl border border-slate-200 p-5 transition hover:border-primary-2 hover:bg-primary-1/5">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-primary-1/10 p-4">
                    <Icon icon="solar:user-id-bold" width={26} className="text-primary-1" />
                  </div>

                  <div>
                    <h3 className="font-semibold">{student.name}</h3>

                    <p className="text-sm text-slate-500">NIK {student.identityNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold">Kelas {student.class}</span>

                  <Button component="RouterLink" href={paths.dashboard.student.detail(student.id)}>
                    Detail
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default UserDetailView;
