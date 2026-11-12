import React, { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';
// routes
import { paths } from '/src/routes/paths';
// hooks
import { useBoolean } from '/src/hooks/use-boolean';
import { UseFinalFormInterface } from '/src/hooks/use-final-form';
import { UseDatabaseUserInterface } from '/src/hooks/use-database-user';
import { UseDatabaseStudentInterface } from '/src/hooks/use-database-student';
// interfaces
import { FormInterface } from '/src/interfaces/form';
import { AssessmentInterface } from '/src/interfaces/assessment';
import { StudentInterface } from '/src/interfaces/student';
import { CurrentUserInterface, UserInterface } from '/src/interfaces/user';
// services
import { sendFormNotificationEmail } from '/src/services/email';
// components
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { DialogConfirm, DialogGeneral } from '/src/components/dialog';

// ----------------------------------------------------------------------

interface FormListProps {
  forms: FormInterface[];
  assessments: AssessmentInterface[];
  currentUser: CurrentUserInterface | null;
  users: UseDatabaseUserInterface['allUsersCache'];
  students: UseDatabaseStudentInterface['allStudentsCache'];
  onDeleteForm: UseFinalFormInterface['deleteFinalForm'];
}

// ----------------------------------------------------------------------

interface ParentSubmissionSummary {
  targetParentEmails: string[];
  submittedParentEmails: string[];
  pendingParentEmails: string[];
}

const getTargetStudentIdsByParent = (form: FormInterface, students: StudentInterface[]): Map<string, string[]> => {
  const selectedClasses = new Set(form.class ?? []);
  const targetStudents = students.filter((student) => selectedClasses.has(student.class));

  return targetStudents.reduce((acc, student) => {
    const current = acc.get(student.parentId) ?? [];
    current.push(student.id);
    acc.set(student.parentId, current);
    return acc;
  }, new Map<string, string[]>());
};

const isParentFormCompleted = (form: FormInterface, assessments: AssessmentInterface[], parentId: string, targetStudentIds: string[]): boolean => {
  if (!targetStudentIds.length) return false;

  const submittedStudentIds = new Set(assessments.filter((assessment) => assessment.formId === form.id && assessment.userId === parentId).map((assessment) => assessment.studenId));

  return targetStudentIds.every((studentId) => submittedStudentIds.has(studentId));
};

// ----------------------------------------------------------------------

const getParentSubmissionSummary = (form: FormInterface, assessments: AssessmentInterface[], users: UserInterface[], students: StudentInterface[]): ParentSubmissionSummary => {
  const targetStudentIdsByParent = getTargetStudentIdsByParent(form, students);
  const targetParentIds = new Set(targetStudentIdsByParent.keys());

  const targetParents = users.filter((user) => user.role === 'parent' && targetParentIds.has(user.id));
  const targetParentEmails = targetParents.map((parent) => parent.email).filter(Boolean);

  const submittedParentEmails = targetParents.filter((parent) => isParentFormCompleted(form, assessments, parent.id, targetStudentIdsByParent.get(parent.id) ?? [])).map((parent) => parent.email);

  const pendingParentEmails = targetParents.filter((parent) => !isParentFormCompleted(form, assessments, parent.id, targetStudentIdsByParent.get(parent.id) ?? [])).map((parent) => parent.email);

  return {
    targetParentEmails,
    submittedParentEmails,
    pendingParentEmails,
  };
};

// ----------------------------------------------------------------------

const FormList: React.FC<FormListProps> = ({ forms, assessments, currentUser, users, students, onDeleteForm }) => {
  const { enqueueSnackbar } = useSnackbar();

  const adminRole = currentUser?.databaseUsers?.role === 'admin';
  const teacherRole = currentUser?.databaseUsers?.role === 'teacher';
  const parentRole = currentUser?.databaseUsers?.role === 'parent';

  const checkAssessment = (formId: string): boolean => {
    const dbUser = currentUser?.databaseUsers;
    if (dbUser?.role !== 'parent') return false;

    const currentForm = forms.find((form) => form.id === formId);
    if (!currentForm) return false;

    const targetStudentIdsByParent = getTargetStudentIdsByParent(currentForm, students);
    const targetStudentIds = targetStudentIdsByParent.get(dbUser.id) ?? [];

    return isParentFormCompleted(currentForm, assessments, dbUser.id, targetStudentIds);
  };

  const handleDeleteForm = useCallback(
    async (id: string) => {
      try {
        await onDeleteForm(id);
        enqueueSnackbar('Form berhasil dihapus');
      } catch (error: any) {
        console.error(error);
        enqueueSnackbar(error.message, { variant: 'error' });
      }
    },
    [enqueueSnackbar, onDeleteForm]
  );

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
      {forms?.map((form, i) => {
        const isFilled = checkAssessment(form.id);
        const canFill = teacherRole || parentRole || adminRole;

        return (
          <div
            key={i}
            className="group relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-primary-1/5 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-1 via-primary-3 to-primary-2" />
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-primary-1/5 blur-3xl transition group-hover:bg-primary-1/10" />
            <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-slate-100 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-1 to-primary-2 text-white shadow-lg shadow-primary-1/20">
                    <span className="rounded-full bg-gradient-to-r from-primary-1 to-primary-2 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                      {form.class?.length ? `${form.class.length} Kelas` : 'Semua Kelas'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Formulir</p>

                      {teacherRole || adminRole ? (
                        <span className="rounded-full bg-primary-1/10 px-2.5 py-1 text-[11px] font-semibold text-primary-1">{form.class?.length ? `${form.class.length} Kelas` : 'Semua Kelas'}</span>
                      ) : null}
                    </div>

                    <p className="mt-2 line-clamp-2 text-xl font-semibold leading-tight text-slate-800">{form.title}</p>

                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{form.description}</p>
                  </div>
                </div>

                {parentRole && (
                  <div className="shrink-0">
                    <div
                      className={twMerge(
                        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
                        isFilled ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                      )}
                    >
                      <span className={twMerge('h-2 w-2 rounded-full', isFilled ? 'bg-emerald-500' : 'bg-rose-500')} />
                      {isFilled ? 'Sudah Terisi' : 'Belum Terisi'}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {teacherRole || adminRole ? (
                  <>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Detail & Hasil</span>

                    <span className="rounded-full bg-primary-1/10 px-3 py-1 text-xs font-medium text-primary-1">Status Pengisian</span>
                  </>
                ) : null}

                {parentRole ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Form Wali Siswa</span> : null}
              </div>
            </div>

            <div className="relative z-10 mt-6 border-t border-slate-100 pt-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {(teacherRole || adminRole) && <RenderDialog assessments={assessments} form={form} users={users} students={students} />}

                  {parentRole && (
                    <div
                      className={twMerge(
                        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium',
                        isFilled ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                      )}
                    >
                      <span className={twMerge('h-2.5 w-2.5 rounded-full', isFilled ? 'bg-emerald-500' : 'bg-rose-500')} />
                      <span>{isFilled ? 'Formulir Sudah Terisi' : 'Formulir Belum Terisi'}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {canFill && !isFilled && (
                    <Button
                      component="RouterLink"
                      href={paths.dashboard.form.input(form.id)}
                      variant="gost"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary-1 px-4 py-2.5 text-white shadow-sm transition hover:bg-primary-3"
                    >
                      <Icon icon="mdi:form" width={18} />
                      <span>Isi Formulir</span>
                    </Button>
                  )}

                  {(teacherRole || adminRole) && (
                    <>
                      <Button
                        component="RouterLink"
                        href={paths.dashboard.form.detail(form.id)}
                        variant="gost"
                        className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                      >
                        <Icon icon="fluent:data-area-24-filled" width={18} />
                      </Button>

                      <Button
                        component="RouterLink"
                        href={paths.dashboard.form.update(form.id)}
                        variant="gost"
                        className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 transition hover:bg-amber-100"
                      >
                        <Icon icon="mdi:pencil" width={18} />
                      </Button>

                      <DialogConfirm
                        label={
                          <Button variant="gost" className="inline-flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100">
                            <Icon icon="mdi:trash" width={18} />
                          </Button>
                        }
                        title={`Konfirmasi penghapusan ${form.title}`}
                        action={() => handleDeleteForm(form.id)}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------------------------

function RenderDialog({
  assessments,
  form,
  users,
  students,
}: {
  assessments: AssessmentInterface[];
  form: FormInterface;
  users: UseDatabaseUserInterface['allUsersCache'];
  students: UseDatabaseStudentInterface['allStudentsCache'];
}) {
  const isShowDialog = useBoolean(false);

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const { targetParentEmails, submittedParentEmails, pendingParentEmails } = useMemo(() => {
    return getParentSubmissionSummary(form, assessments, users, students);
  }, [assessments, form, students, users]);

  const totalSubmittedParents = submittedParentEmails.length;
  const totalTargetParents = targetParentEmails.length;

  const formAssessments = assessments.filter((a) => a.formId === form.id);
  const totalAssessments = formAssessments.length;

  const handleSendEmail = useCallback(async () => {
    if (pendingParentEmails.length === 0 || isSendingEmail) return;

    setIsSendingEmail(true);

    try {
      await sendFormNotificationEmail(pendingParentEmails, form.id, form.title);

      enqueueSnackbar('Email berhasil dikirim kepada wali siswa');
    } catch (error: any) {
      enqueueSnackbar('Email notifikasi gagal dikirim', {
        variant: 'error',
      });
      console.error(error);
    } finally {
      setIsSendingEmail(false);
    }
  }, [enqueueSnackbar, form.id, form.title, isSendingEmail, pendingParentEmails]);

  return (
    <>
      <Button onClick={isShowDialog.onTrue} variant="gost" className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-slate-700 transition hover:bg-slate-200">
        <span className="font-medium">{totalAssessments} Jawaban</span>
        <Icon icon="mdi:eye" width={18} />
      </Button>

      <DialogGeneral state={isShowDialog} centered className="p-6 md:w-[640px]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-1/10">
              <Icon icon="solar:clipboard-check-bold" width={24} className="text-primary-1" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Status Pengisian</p>
              <h2 className="mt-1 font-poppins text-2xl font-bold text-slate-800">Wali Siswa</h2>
              <p className="mt-1 text-sm text-slate-500">
                {totalSubmittedParents} dari {totalTargetParents} email wali siswa sudah mengisi formulir ini.
              </p>
            </div>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            {totalSubmittedParents}/{totalTargetParents} Terisi
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <RenderEmailSection
            title={`Sudah Submit (${submittedParentEmails.length})`}
            emails={submittedParentEmails}
            className="border-emerald-200 bg-emerald-50/70"
            icon="solar:check-circle-bold"
            iconClassName="text-emerald-600"
          />

          <RenderEmailSection
            title={`Belum Submit (${pendingParentEmails.length})`}
            emails={pendingParentEmails}
            className="border-rose-200 bg-rose-50/70"
            icon="solar:clock-circle-bold"
            iconClassName="text-rose-600"
          />
        </div>

        {pendingParentEmails.length > 0 && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Icon icon="solar:letter-bold" width={20} className="text-amber-700" />
                </div>

                <div>
                  <p className="font-medium text-slate-800">Kirim notifikasi pengingat?</p>
                  <p className="text-sm text-slate-500">Email akan dikirim ke wali siswa yang belum mengisi formulir ini.</p>
                </div>
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="inline-flex items-center gap-2 text-nowrap rounded-xl bg-primary-1 px-4 py-2.5 text-white transition hover:bg-primary-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon icon="solar:send-bold" width={18} />
                <span>{isSendingEmail ? 'Mengirim email...' : 'Kirim Email'}</span>
              </Button>
            </div>
          </div>
        )}
      </DialogGeneral>
    </>
  );
}

// ----------------------------------------------------------------------

function RenderEmailSection({ title, emails, className, icon, iconClassName }: { title: string; emails: string[]; className?: string; icon: string; iconClassName?: string }) {
  return (
    <div className={twMerge('rounded-2xl border p-4', className)}>
      <div className="mb-4 flex items-center gap-2">
        <Icon icon={icon} width={18} className={twMerge('shrink-0', iconClassName)} />
        <p className="font-semibold text-slate-900">{title}</p>
      </div>

      {emails.length > 0 ? (
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
          {emails.map((email) => (
            <div key={email} className="rounded-xl border border-white/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              {email}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-white/70 px-3 py-4 text-sm text-slate-500">Tidak ada email.</div>
      )}
    </div>
  );
}

export default FormList;
