// routes
import { paths } from '/src/routes/paths';

// ----------------------------------------------------------------------

export interface ConfigNavigationInterface {
  title: string;
  path: string;
  icon: string;
  children?: ConfigNavigationInterface[];
}

// ----------------------------------------------------------------------

export const configNavigation: ConfigNavigationInterface[] = [
  {
    title: 'Dashboard',
    path: paths.dashboard.root,
    icon: 'mage:dashboard-fill',
  },
  {
    title: 'Pengguna',
    path: paths.dashboard.user.root,
    icon: 'mdi:users',
  },
  {
    title: 'Siswa',
    path: paths.dashboard.student.root,
    icon: 'ph:student-fill',
  },
  {
    title: 'Formulir',
    path: paths.dashboard.form.root,
    icon: 'mdi:form',
  },
  {
    title: 'Absensi Guru',
    path: paths.dashboard.attendance.root,
    icon: 'mdi:calendar-check',
  },
];
