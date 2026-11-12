export type TeacherAttendanceStatus = 'present' | 'absent';

export interface TeacherAttendanceInterface {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  status: TeacherAttendanceStatus;
  note: string;
  isVerified: boolean;
  verifiedBy?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: unknown;
}
