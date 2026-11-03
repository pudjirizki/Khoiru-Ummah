export type TeacherAttendanceStatusType = 'Hadir' | 'Tidak hadir';

export interface TeacherAttendanceInterface {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  status: TeacherAttendanceStatusType;
  note: string;
  checkedInAt: Date | null;
  updatedAt: Date | null;
  updatedByName: string;
}
