import { useEffect, useState, useCallback, useRef } from 'react';
// supabase
import { supabase } from '/src/supabase';
// interfaces
import { PayloadCreateAnswerInterface } from '/src/interfaces/answer';
import { PayloadCreateAnswerDetailInterface } from '/src/interfaces/answer-details';
import { AssessmentInterface, PayloadCreateAssessmentInterface } from '/src/interfaces/assessment';
import { FinalAssessmentInterface, FinalAssessmentsParamsInterface, PayloadCreateAnswersFinalAssessmentInterface, PayloadCreateFinalAssessmentInterface } from '/src/interfaces/final-assessment';
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
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  finalAssessments: (params?: FinalAssessmentsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  getFinalAssessmentById: (id: string) => AssessmentInterface | null;
  fetchFinalAssessmentById: (id: string) => Promise<FinalAssessmentInterface | null>;
  allFinalAssessmentsCache: AssessmentInterface[];
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
  createdAt: data.created_at ? new Date(data.created_at) : new Date(),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
});

// ----------------------------------------------------------------------

export const useFinalAssessment = (): UseFinalAssessmentInterface => {
  const [allFinalAssessmentsCache, setAllFinalAssessmentsCache] = useState<AssessmentInterface[]>([]);
  const [finalAssessmentsList, setFinalAssessmentsList] = useState<AssessmentInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<FinalAssessmentsParamsInterface>({ formId: '', userId: '', studentId: '', limit: 50, perPage: 5 });

  const { createAssessment, allAssessmentsCache: assessmentsCacheFromHook, deleteAssessment, fetchAssessmentById, updateAssessment, getAssessmentById } = useDatabaseAssessment();
  const { createAnswer, allAnswersCache, deleteAnswer, updateAnswer } = useDatabaseAnswer();
  const { createAnswerDetail, allAnswerDetailsCache, deleteAnswerDetail, updateAnswerDetail } = useDatabaseAnswerDetail();
  const { createNotification } = useDatabaseNotification();
  const { allUsersCache } = useDatabaseUser();
  const { allStudentsCache } = useDatabaseStudent();

  // sync from hook
  useEffect(() => {
    if (Array.isArray(assessmentsCacheFromHook)) {
      setAllFinalAssessmentsCache(assessmentsCacheFromHook);
    }
  }, [assessmentsCacheFromHook]);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);

    try {
      const { formId, userId, studentId } = paramsRef.current;
      const pageSize = perPageRef.current;
      const from = (pageIndex - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = supabase.from('assessments').select('*', { count: 'exact' });

      if (formId) q = q.eq('form_id', formId);
      if (userId) q = q.eq('user_id', userId);
      if (studentId) q = q.eq('student_id', studentId);

      q = q.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await q;

      if (error) {
        console.error('paginate fetch error', error.code, error.message);
        setIsLoading(false);
        return;
      }

      const list = (data ?? []).map(mapAssessment);
      setFinalAssessmentsList(list);
      if (count !== null) setTotalCount(count);
      setPage(pageIndex);
    } catch (err) {
      console.error('paginate snapshot error', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const finalAssessments = useCallback(
    (params?: FinalAssessmentsParamsInterface) => {
      const formId = params?.formId ?? '';
      const userId = params?.userId ?? '';
      const studentId = params?.studentId ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { formId, userId, studentId, limit, perPage };
      limitRef.current = limit;
      perPageRef.current = perPage;

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

  const getFinalAssessmentById = useCallback(
    (id: string): AssessmentInterface | null => {
      if (!id) return null;
      return getAssessmentById ? getAssessmentById(id) : (allFinalAssessmentsCache.find((u) => u.id === id) ?? null);
    },
    [allFinalAssessmentsCache, getAssessmentById]
  );

  const formatTimestamp = (value: any): string => {
    const date = value instanceof Date ? value : new Date(value);
    const datePart = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' } as any);
    const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Jakarta' } as any);
    return `${datePart} at ${timePart} UTC+7`;
  };

  const fetchFinalAssessmentById = useCallback(
    async (id: string): Promise<FinalAssessmentInterface | null> => {
      if (!id) return null;

      try {
        const assessment = await fetchAssessmentById(id);
        if (!assessment?.id) return null;

        const { data: answersRaw, error: ansErr } = await supabase
          .from('answers')
          .select('*')
          .eq('assessment_id', id);

        if (ansErr) throw ansErr;

        const answersWithDetails = await Promise.all(
          (answersRaw ?? []).map(async (c: any) => {
            const { data: dData, error: dErr } = await supabase
              .from('answer_details')
              .select('*')
              .eq('answer_id', c.id);

            if (dErr) throw dErr;

            const answerDetailsSorted = (dData ?? [])
              .slice()
              .sort((a: any, b: any) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
              .map((q: any) => ({
                id: q.id,
                answerId: q.answer_id,
                questionId: q.question_id,
                point: q.point,
                createdAt: formatTimestamp(q.created_at),
                updatedAt: formatTimestamp(q.updated_at),
              }));

            return {
              id: c.id,
              assessmentId: c.assessment_id,
              criteriaId: c.criteria_id,
              averagePoint: c.average_point,
              answerDetails: answerDetailsSorted,
              createdAt: formatTimestamp(c.created_at),
              updatedAt: formatTimestamp(c.updated_at),
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

        // create assessment
        const resAssessment = await createAssessment({
          ...(assessmentPayload as PayloadCreateAssessmentInterface),
          catatan: normalizedCatatan,
          studentClass: assessmentPayload.studentClass ?? student?.class ?? '',
        });
        const assessmentId = getId(resAssessment);
        if (!assessmentId) throw new Error('Failed to create assessment');

        // create answers + details concurrently
        if (Array.isArray(answers) && answers.length > 0) {
          await Promise.all(answers.map((ans) => createAnswerWithDetails(ans, assessmentId)));
        }

        const triggeringUser = allUsersCache.find((u) => u.id === assessmentPayload.userId);
        const targetRole = resolveTargetRole(triggeringUser?.role);
        const userTargetId = resolveNotificationRecipient(targetRole, assessmentPayload);

        await createNotification({
          formId: assessmentPayload.formId,
          userId: userTargetId ?? '',
          name: triggeringUser?.name ?? '',
          description: 'telah mengisi formulir',
          isRead: false,
          targetRole,
        });

        await createNotification({
          formId: assessmentPayload.formId,
          userId: userTargetId ?? '',
          name: triggeringUser?.name ?? '',
          description: 'telah mengisi formulir',
          isRead: false,
          targetRole: 'admin',
        });

        return await fetchAssessmentById(assessmentId);
      } catch (error) {
        throw safeWrapError(error);
      }
    },
    [allStudentsCache, allUsersCache, createAnswer, createAnswerDetail, createAssessment, createNotification, fetchAssessmentById]
  );

  const updateFinalAssessment = useCallback(
    async (id: string, payload: Partial<Omit<AssessmentInterface, 'id' | 'createdAt' | 'updatedAt'>>, currentFinalAssessment?: FinalAssessmentInterface) => {
      if (!id) return null;

      try {
        const { answers: payloadAnswers, ...restAssessmentsFields } = payload as any;

        if (currentFinalAssessment) {
          const assessmentUpdatePayload: Record<string, any> = {};
          for (const k of Object.keys(restAssessmentsFields)) {
            const newVal = restAssessmentsFields[k];
            const oldVal = (currentFinalAssessment as any)[k];
            const changed = typeof newVal === 'object' ? JSON.stringify(newVal) !== JSON.stringify(oldVal) : newVal !== oldVal;
            if (newVal !== undefined && changed) assessmentUpdatePayload[k] = newVal;
          }
          if (Object.keys(assessmentUpdatePayload).length > 0) {
            await updateAssessment(id, assessmentUpdatePayload);
          }
        } else {
          if (Object.keys(restAssessmentsFields).length > 0) await updateAssessment(id, restAssessmentsFields);
        }

        if (!Array.isArray(payloadAnswers)) {
          return await fetchAssessmentById(id);
        }

        for (const pc of payloadAnswers) {
          const { id: payloadAnsId, answerDetails: payloadAnswerDetails = [], ...answerFields } = pc as any;

          if (payloadAnsId) {
            const critUpdate: Record<string, any> = {};
            for (const k of Object.keys(answerFields)) {
              const v = answerFields[k];
              if (v !== undefined) critUpdate[k] = v;
            }
            if (Object.keys(critUpdate).length > 0) {
              await updateAnswer(payloadAnsId, critUpdate);
            }

            if (Array.isArray(payloadAnswerDetails) && payloadAnswerDetails.length > 0) {
              await Promise.all(
                payloadAnswerDetails.map(async (pq: any) => {
                  const { id: payloadDId, ...qFields } = pq;

                  if (payloadDId) {
                    const dUpdate: Record<string, any> = {};
                    if (qFields.text !== undefined) dUpdate.text = qFields.text;
                    for (const k of Object.keys(qFields)) {
                      if (k === 'text') continue;
                      const vv = qFields[k];
                      if (vv !== undefined) dUpdate[k] = vv;
                    }
                    if (Object.keys(dUpdate).length > 0) {
                      await updateAnswerDetail(payloadDId, dUpdate);
                    }
                  } else {
                    await createAnswerDetail({
                      ...qFields,
                      answerId: payloadAnsId,
                    } as PayloadCreateAnswerDetailInterface);
                  }
                })
              );
            }
            continue;
          }

          const createdAns = await createAnswer({
            ...answerFields,
            assessmentId: id,
          } as PayloadCreateAnswerInterface);

          const createdAnsId = (createdAns && (createdAns as any).id) ?? (typeof createdAns === 'string' ? createdAns : '');

          if (!createdAnsId) continue;

          if (Array.isArray(payloadAnswerDetails) && payloadAnswerDetails.length > 0) {
            await Promise.all(
              payloadAnswerDetails.map((pq: any) =>
                createAnswerDetail({
                  ...pq,
                  answerId: createdAnsId,
                } as PayloadCreateAnswerDetailInterface)
              )
            );
          }
        }

        const updated = await fetchAssessmentById(id);

        if (updated) {
          try {
            setAllFinalAssessmentsCache((prev: any[]) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setFinalAssessmentsList((prev: any[]) => prev.map((u) => (u.id === updated.id ? updated : u)));
          } catch {
            // ignore
          }
        }

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [createAnswer, createAnswerDetail, fetchAssessmentById, updateAnswer, updateAnswerDetail, updateAssessment]
  );

  const deleteFinalAssessment = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;
      try {
        const existingAnswers = (allAnswersCache || []).filter((c: any) => c.formId === id);

        await Promise.all(
          existingAnswers.map(async (c: any) => {
            const questionsForC = (allAnswerDetailsCache || []).filter((q: any) => q.criteriaId === c.id);
            await Promise.all(questionsForC.map((q: any) => deleteAnswerDetail(q.id)));
            await deleteAnswer(c.id);
          })
        );

        await deleteAssessment(id);

        setAllFinalAssessmentsCache((prev) => prev.filter((u) => u.id !== id));
        setFinalAssessmentsList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [allAnswerDetailsCache, allAnswersCache, deleteAnswer, deleteAnswerDetail, deleteAssessment]
  );

  const maxPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
  const hasNext = page < maxPages;
  const hasPrev = page > 1;

  return {
    finalAssessmentsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages,
    hasNext,
    hasPrev,
    finalAssessments,
    nextPage,
    prevPage,
    resetPagination,
    getFinalAssessmentById,
    fetchFinalAssessmentById,
    createFinalAssessment,
    updateFinalAssessment,
    deleteFinalAssessment,
    allFinalAssessmentsCache,
  };
};
