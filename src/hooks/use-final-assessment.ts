import { useEffect, useState, useCallback, useRef } from 'react';
// supabase
import { supabase } from '/src/lib/supabase';
// interfaces
import { PayloadCreateAnswerInterface } from '/src/interfaces/answer';
import { PayloadCreateAnswerDetailInterface } from '/src/interfaces/answer-details';
import { AssessmentInterface, PayloadCreateAssessmentInterface } from '/src/interfaces/assessment';
import {
  FinalAssessmentInterface,
  FinalAssessmentsParamsInterface,
  PayloadCreateAnswersFinalAssessmentInterface,
  PayloadCreateFinalAssessmentInterface,
} from '/src/interfaces/final-assessment';
// hooks
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseAnswer } from '/src/hooks/use-database-answer';
import { useDatabaseStudent } from '/src/hooks/use-database-student';
import { useDatabaseAssessment } from '/src/hooks/use-database-assessment';
import { useDatabaseNotification } from '/src/hooks/use-database-notification';
import { useDatabaseAnswerDetail } from '/src/hooks/use-database-answer-detail';

// ----------------------------------------------------------------------

export interface UseFinalAssessmentInterface {
  finalAssessmentsList: AssessmentInterface[];
  isLoading: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // controls
  finalAssessments: (params?: FinalAssessmentsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  // helpers
  getFinalAssessmentById: (id: string) => AssessmentInterface | null;
  fetchFinalAssessmentById: (id: string) => Promise<FinalAssessmentInterface | null>;
  // raw
  allFinalAssessmentsCache: AssessmentInterface[];
  //
  createFinalAssessment: (payload: PayloadCreateFinalAssessmentInterface) => Promise<AssessmentInterface | null>;
  updateFinalAssessment: (
    id: string,
    payload: Partial<Omit<AssessmentInterface, 'id' | 'createdAt' | 'updatedAt'>>,
    currentFinalAssessment: FinalAssessmentInterface
  ) => Promise<AssessmentInterface | null>;
  deleteFinalAssessment: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapAssessment = (data: any): AssessmentInterface => ({
  id: data.id,
  formId: data.form_id ?? data.formId,
  userId: data.user_id ?? data.userId,
  studenId: data.student_id ?? data.studenId,
  studentClass: data.student_class ?? data.studentClass,
  catatan: data.catatan,
  score: data.score,
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
});

// ----------------------------------------------------------------------

export const useFinalAssessment = (): UseFinalAssessmentInterface => {
  const [allFinalAssessmentsCache, setAllFinalAssessmentsCache] = useState<AssessmentInterface[]>([]);
  const [finalAssessmentsList, setFinalAssessmentsList] = useState<AssessmentInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<FinalAssessmentsParamsInterface>({ formId: '', userId: '', studentId: '', limit: 50, perPage: 5 });

  const { createAssessment, allAssessmentsCache: assessmentsCacheFromHook, deleteAssessment, fetchAssessmentById, updateAssessment, getAssessmentById } = useDatabaseAssessment();
  const { createAnswer, allAnswersCache, deleteAnswer, updateAnswer } = useDatabaseAnswer();
  const { createAnswerDetail, allAnswerDetailsCache, deleteAnswerDetail, updateAnswerDetail } = useDatabaseAnswerDetail();
  const { createNotification } = useDatabaseNotification();
  const { allUsersCache } = useDatabaseUser();
  const { allStudentsCache } = useDatabaseStudent();

  // sync from hook cache
  useEffect(() => {
    if (Array.isArray(assessmentsCacheFromHook)) {
      setAllFinalAssessmentsCache(assessmentsCacheFromHook);
    }
  }, [assessmentsCacheFromHook]);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const perPage = perPageRef.current;
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);
    try {
      const { formId, userId, studentId } = paramsRef.current;
      const from = (pageIndex - 1) * perPage;
      const to = from + perPage - 1;

      let q = supabase.from('assessments').select('*').order('created_at', { ascending: false });

      if (formId) q = q.eq('form_id', formId);
      if (userId) q = q.eq('user_id', userId);
      if (studentId) q = q.eq('student_id', studentId);

      q = q.range(from, to);

      const { data } = await q;
      setFinalAssessmentsList((data ?? []).map(mapAssessment));
    } finally {
      setIsLoading(false);
    }
    setPage(pageIndex);
  }, []);

  const finalAssessments = useCallback(
    (params?: FinalAssessmentsParamsInterface) => {
      paramsRef.current = {
        formId: params?.formId ?? '',
        userId: params?.userId ?? '',
        studentId: params?.studentId ?? '',
        limit: params?.limit ?? 50,
        perPage: params?.perPage ?? 5,
      };
      limitRef.current = params?.limit ?? 50;
      perPageRef.current = params?.perPage ?? 5;
      subscribePage(1);
    },
    [subscribePage]
  );

  const nextPage = useCallback(() => {
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
    if (page >= max) return;
    subscribePage(page + 1);
  }, [page, subscribePage]);

  const prevPage = useCallback(() => {
    if (page <= 1) return;
    subscribePage(page - 1);
  }, [page, subscribePage]);

  const resetPagination = useCallback(() => {
    setFinalAssessmentsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  // LOCAL GETTER
  const getFinalAssessmentById = useCallback(
    (id: string): AssessmentInterface | null => {
      if (!id) return null;
      return getAssessmentById ? getAssessmentById(id) : (allFinalAssessmentsCache.find((u) => u.id === id) ?? null);
    },
    [allFinalAssessmentsCache, getAssessmentById]
  );

  // FORMAT TIME
  const formatTimestamp = (value: any): string => {
    const date = value instanceof Date ? value : new Date(value);
    const datePart = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' } as any);
    const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Jakarta' } as any);
    return `${datePart} at ${timePart} UTC+7`;
  };

  // FETCH FINAL ASSESSMENT
  const fetchFinalAssessmentById = useCallback(
    async (id: string): Promise<FinalAssessmentInterface | null> => {
      if (!id) return null;

      try {
        const assessment = await fetchAssessmentById(id);
        if (!assessment?.id) return null;

        const { data: answersData } = await supabase
          .from('answers')
          .select('*')
          .eq('assessment_id', id);

        const answersRaw = (answersData ?? []).map((d) => ({
          id: d.id,
          assessmentId: d.assessment_id ?? d.assessmentId,
          criteriaId: d.criteria_id ?? d.criteriaId,
          averagePoint: d.average_point ?? d.averagePoint,
          createdAt: d.created_at ?? d.createdAt,
          updatedAt: d.updated_at ?? d.updatedAt,
        }));

        const answersWithDetails = await Promise.all(
          answersRaw.map(async (c) => {
            const { data: detailsData } = await supabase
              .from('answer_details')
              .select('*')
              .eq('answer_id', c.id);

            const answerDetailsRaw = (detailsData ?? []).map((qD) => ({
              id: qD.id,
              answerId: qD.answer_id ?? qD.answerId,
              questionId: qD.question_id ?? qD.questionId,
              point: qD.point,
              createdAt: qD.created_at ?? qD.createdAt,
              updatedAt: qD.updated_at ?? qD.updatedAt,
            }));

            const answerDetailsSorted = answerDetailsRaw
              .slice()
              .sort((a: any, b: any) => {
                const aa = new Date(a.createdAt ?? 0).getTime();
                const bb = new Date(b.createdAt ?? 0).getTime();
                return aa - bb;
              })
              .map((q: any) => ({
                ...q,
                createdAt: formatTimestamp(q.createdAt),
                updatedAt: formatTimestamp(q.updatedAt),
              }));

            return {
              ...c,
              answerDetails: answerDetailsSorted,
              createdAt: formatTimestamp(c.createdAt),
              updatedAt: formatTimestamp(c.updatedAt),
            };
          })
        );

        return {
          ...assessment,
          createdAt: formatTimestamp((assessment as any).createdAt),
          updatedAt: formatTimestamp((assessment as any).updatedAt),
          answers: answersWithDetails,
        };
      } catch (error) {
        console.error('fetchFinalAssessmentById error:', error);
        return null;
      }
    },
    [fetchAssessmentById]
  );

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CREATE FINAL ASSESSMENT
  const createFinalAssessment = useCallback(
    async (payload: PayloadCreateFinalAssessmentInterface) => {
      const getId = (res: unknown): string | undefined => {
        if (!res) return undefined;
        if (typeof res === 'string') return res;
        if (typeof res === 'object' && res !== null) return (res as any).id ?? undefined;
        return undefined;
      };

      const createAnswerWithDetails = async (answer: PayloadCreateAnswersFinalAssessmentInterface, assessmentId: string) => {
        const { answerDetails = [], ...answerPayload } = answer;
        const createdAnswer = await createAnswer({
          ...answerPayload,
          assessmentId,
        } as PayloadCreateAnswerInterface);

        const answerId = getId(createdAnswer);
        if (!answerId) return;

        if (Array.isArray(answerDetails) && answerDetails.length > 0) {
          await Promise.all(answerDetails.map((detail) => createAnswerDetail({ ...detail, answerId } as PayloadCreateAnswerDetailInterface)));
        }
      };

      const resolveTargetRole = (role?: string): 'parent' | 'teacher' | 'admin' => {
        if (role === 'teacher') return 'parent';
        if (role === 'parent') return 'teacher';
        return 'admin';
      };

      const resolveNotificationRecipient = (targetRole: string, assessmentPayload: Partial<PayloadCreateAssessmentInterface>): string | undefined => {
        if (targetRole === 'parent') {
          const studentId = (assessmentPayload as any).studenId;
          const student = allStudentsCache.find((s) => s.id === studentId);
          return student?.parentId;
        }
        return undefined;
      };

      try {
        const { answers = [], ...assessmentPayload } = payload;
        const student = allStudentsCache.find((s) => s.id === assessmentPayload.studenId);
        const normalizedCatatan = typeof assessmentPayload.catatan === 'string' ? assessmentPayload.catatan.trim() : '';

        const resAssessment = await createAssessment({
          ...(assessmentPayload as PayloadCreateAssessmentInterface),
          catatan: normalizedCatatan,
          studentClass: assessmentPayload.studentClass ?? student?.class ?? '',
        });
        const assessmentId = getId(resAssessment);
        if (!assessmentId) throw new Error('Failed to create assessment');

        if (Array.isArray(answers) && answers.length > 0) {
          await Promise.all(answers.map((answer) => createAnswerWithDetails(answer, assessmentId)));
        }

        const user = allUsersCache.find((u) => u.id === assessmentPayload.userId);
        const targetRole = resolveTargetRole(user?.role);
        const recipientUserId = resolveNotificationRecipient(targetRole, assessmentPayload);

        await createNotification({
          userId: recipientUserId ?? '',
          formId: assessmentPayload.formId ?? '',
          name: `${user?.name ?? 'Pengguna'} Mengirimkan Penilaian`,
          description: `${user?.name ?? 'Pengguna'} telah mengirimkan penilaian untuk formulir yang terkait.`,
          isRead: false,
          targetRole,
        });

        return await fetchAssessmentById(assessmentId);
      } catch (error) {
        throw safeWrapError(error);
      }
    },
    [allStudentsCache, allUsersCache, createAnswer, createAnswerDetail, createAssessment, createNotification, fetchAssessmentById]
  );

  // UPDATE FINAL ASSESSMENT
  const updateFinalAssessment = useCallback(
    async (
      id: string,
      payload: Partial<Omit<AssessmentInterface, 'id' | 'createdAt' | 'updatedAt'>>,
      currentFinalAssessment: FinalAssessmentInterface
    ) => {
      if (!id) return null;

      try {
        const { answers = [], ...restAssessmentFields } = payload as any;
        const currentAnswers = currentFinalAssessment?.answers ?? [];

        const hasChanges = Object.keys(restAssessmentFields).some((key) => {
          const newVal = restAssessmentFields[key];
          const oldVal = (currentFinalAssessment as any)[key];
          return newVal !== undefined && newVal !== oldVal;
        });

        if (hasChanges) {
          await updateAssessment(id, restAssessmentFields);
        }

        if (Array.isArray(answers) && answers.length > 0) {
          await Promise.all(
            answers.map(async (answer: any) => {
              const currentAnswer = currentAnswers.find((ca) => ca.id === answer.id || ca.criteriaId === answer.criteriaId);

              if (currentAnswer) {
                if (answer.averagePoint !== undefined && answer.averagePoint !== currentAnswer.averagePoint) {
                  await updateAnswer(currentAnswer.id, { averagePoint: answer.averagePoint });
                }

                if (Array.isArray(answer.answerDetails) && answer.answerDetails.length > 0) {
                  const currentDetails = currentAnswer.answerDetails ?? [];

                  await Promise.all(
                    answer.answerDetails.map(async (detail: any) => {
                      const currentDetail = currentDetails.find((cd) => cd.id === detail.id || cd.questionId === detail.questionId);

                      if (currentDetail) {
                        if (detail.point !== undefined && detail.point !== currentDetail.point) {
                          await updateAnswerDetail(currentDetail.id, { point: detail.point });
                        }
                      } else {
                        await createAnswerDetail({
                          answerId: currentAnswer.id,
                          questionId: detail.questionId,
                          point: detail.point,
                        });
                      }
                    })
                  );
                }
              }
            })
          );
        }

        const updated = await fetchAssessmentById(id);
        if (updated) {
          setAllFinalAssessmentsCache((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          setFinalAssessmentsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        }
        return updated;
      } catch (error) {
        throw safeWrapError(error);
      }
    },
    [createAnswerDetail, fetchAssessmentById, updateAnswer, updateAnswerDetail, updateAssessment]
  );

  // DELETE FINAL ASSESSMENT
  const deleteFinalAssessment = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;

      try {
        const answersToDelete = (allAnswersCache || []).filter((a) => a.assessmentId === id);

        await Promise.all(
          answersToDelete.map(async (a) => {
            const detailsToDelete = (allAnswerDetailsCache || []).filter((d) => d.answerId === a.id);
            await Promise.all(detailsToDelete.map((d) => deleteAnswerDetail(d.id)));
            await deleteAnswer(a.id);
          })
        );

        await deleteAssessment(id);

        setAllFinalAssessmentsCache((prev) => prev.filter((a) => a.id !== id));
        setFinalAssessmentsList((prev) => prev.filter((a) => a.id !== id));
        return true;
      } catch (error) {
        throw safeWrapError(error);
      }
    },
    [allAnswerDetailsCache, allAnswersCache, deleteAnswer, deleteAnswerDetail, deleteAssessment]
  );

  return {
    finalAssessmentsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext: page < Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasPrev: page > 1,
    finalAssessments,
    nextPage,
    prevPage,
    resetPagination,
    getFinalAssessmentById,
    fetchFinalAssessmentById,
    allFinalAssessmentsCache,
    createFinalAssessment,
    updateFinalAssessment,
    deleteFinalAssessment,
  };
};
