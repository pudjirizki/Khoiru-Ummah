export const paths = {
  auth: {
    login: '/auth/login',
  },
  main: {
    root: '/',
  },
  dashboard: {
    root: '/dashboard',
    form: {
      root: '/dashboard/form',
      create: '/dashboard/form/create',
      input: (slug: string) => `/dashboard/form/${slug}/input`,
      update: (slug: string) => `/dashboard/form/${slug}/update`,
      detail: (slug: string) => `/dashboard/form/${slug}/detail`,
    },
    profile: {
      root: '/dashboard/profile',
    },
    user: {
      root: '/dashboard/user',
      create: '/dashboard/user/create',
      update: (slug: string) => `/dashboard/user/${slug}/update`,
      detail: (slug: string) => `/dashboard/user/${slug}/detail`,
    },
    student: {
      root: '/dashboard/student',
      create: '/dashboard/student/create',
      update: (slug: string) => `/dashboard/student/${slug}/update`,
      detail: (slug: string) => `/dashboard/student/${slug}/detail`,
    },
    attendance: {
      root: '/dashboard/attendance',
    },
  },
} as const;
