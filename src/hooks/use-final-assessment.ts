import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, limit as fbLimit, startAfter, QueryDocumentSnapshot, Timestamp, where, getDocs } from 'firebase/firestore';
// firebase
import { fbFirestore } from '/src/firebase';
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
  formId: data.formId,
  userId: data.userId,
  studenId: data.studenId,
  studentClass: data.studentClass,
  catatan: data.catatan,
  score: data.score,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

// ----------------------------------------------------------------------

export const useFinalAssessment = (): UseFinalAssessmentInterface => {
  const [allFinalAssessmentsCache, setAllFinalAssessmentsCache] = useState<AssessmentInterface[]>([]);

  const [finalAssessmentsList, setFinalAssessmentsList] = useState<AssessmentInterface[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<FinalAssessmentsParamsInterface>({ formId: '', userId: '', studentId: '', limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const { createAssessment, allAssessmentsCache: assessmentsCacheFromHook, deleteAssessment, fetchAssessmentById, updateAssessment, getAssessmentById } = useDatabaseAssessment();

  const { createAnswer, allAnswersCache, deleteAnswer, updateAnswer } = useDatabaseAnswer();

  const { createAnswerDetail, allAnswerDetailsCache, deleteAnswerDetail, updateAnswerDetail } = useDatabaseAnswerDetail();

  const { createNotification } = useDatabaseNotification();

  const { allUsersCache } = useDatabaseUser();

  const { allStudentsCache } = useDatabaseStudent();

  // sync
  useEffect(() => {
    if (Array.isArray(assessmentsCacheFromHook)) {
      setAllFinalAssessmentsCache(assessmentsCacheFromHook);
    }
  }, [assessmentsCacheFromHook]);

  // ALL ASSESSMENT CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'assessments'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: AssessmentInterface[] = [];
        snap.forEach((d) => arr.push(mapAssessment({ id: d.id, ...d.data() })));
        setAllFinalAssessmentsCache(arr);
      },
      (err) => {
        console.error('allFinalAssessmentsCache snapshot error', err);
        setAllFinalAssessmentsCache([]);
      }
    );

    return () => {
      unsub();
      setAllFinalAssessmentsCache([]);
    };
  }, []);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { formId, userId, studentId } = paramsRef.current;
    const pageSize = perPageRef.current;

    const collectionRef = collection(fbFirestore, 'assessments');
    const qParts: any[] = [];

    if (formId) qParts.push(where('formId', '==', formId));
    if (userId) qParts.push(where('userId', '==', userId));
    if (studentId) qParts.push(where('studentId', '==', studentId));

    qParts.push(orderBy('createdAt', 'desc'));

    if (pageIndex > 1) {
      const cursor = cursorsRef.current[pageIndex - 1] ?? null;
      if (cursor) {
        qParts.push(startAfter(cursor));
      }
    }

    qParts.push(fbLimit(pageSize));

    return query(collectionRef, ...qParts);
  }, []);

  const subscribePage = useCallback(
    (pageIndex: number) => {
      const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
      if (pageIndex < 1 || pageIndex > max) return;

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      setIsLoading(true);
      const q = buildQueryForPage(pageIndex);

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: AssessmentInterface[] = [];
          snap.forEach((d) => {
            list.push(mapAssessment({ id: d.id, ...d.data() }));
          });

          setFinalAssessmentsList(list);
          setIsLoading(false);

          const last = snap.docs[snap.docs.length - 1] ?? null;
          lastVisibleRef.current = last || null;
          cursorsRef.current[pageIndex] = last || null;
        },
        (err) => {
          console.error('paginate snapshot error', err.code, err.message);
          setIsLoading(false);
        }
      );

      unsubscribeRef.current = unsub;
      setPage(pageIndex);
    },
    [buildQueryForPage]
  );

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

      cursorsRef.current = [null];
      lastVisibleRef.current = null;

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
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    cursorsRef.current = [null];
    lastVisibleRef.current = null;
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
    const date = value && typeof value.toDate === 'function' ? value.toDate() : value instanceof Date ? value : new Date(value);
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

        const answersSnap = await getDocs(query(collection(fbFirestore, 'answers'), where('assessmentId', '==', id)));
        const answersRaw = answersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

        const answersWithDetails = await Promise.all(
          answersRaw.map(async (c) => {
            const dSnap = await getDocs(query(collection(fbFirestore, 'answerDetails'), where('answerId', '==', c.id)));
            const answerDetailsRaw = dSnap.docs.map((qD) => ({ id: qD.id, ...(qD.data() as any) }));

            const answerDetailsSorted = answerDetailsRaw
              .slice()
              .sort((a: any, b: any) => {
                const aa = a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate().getTime() : new Date(a.createdAt ?? 0).getTime();
                const bb = b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate().getTime() : new Date(b.createdAt ?? 0).getTime();
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
  // const createFinalAssessment = useCallback(
  //   async (payload: PayloadCreateFinalAssessmentInterface) => {
  //     try {
  //       const { answers = [], ...assessmentPayload } = payload;

  //       const resAssessment = await createAssessment(assessmentPayload as PayloadCreateAssessmentInterface);
  //       const assessmentId = (resAssessment && (resAssessment as any).id) ?? (typeof resAssessment === 'string' ? resAssessment : '');

  //       await Promise.all(
  //         answers.map(async (c: PayloadCreateAnswersFinalAssessmentInterface) => {
  //           const { answerDetails = [], ...answerPayload } = c;

  //           const createdAnswer = await createAnswer({
  //             ...answerPayload,
  //             assessmentId,
  //           } as PayloadCreateAnswerInterface);

  //           const answerId = (createdAnswer && (createdAnswer as any).id) ?? (typeof createdAnswer === 'string' ? createdAnswer : '');

  //           if (Array.isArray(answerDetails) && answerDetails.length > 0 && answerId) {
  //             await Promise.all(
  //               answerDetails.map((q) =>
  //                 createAnswerDetail({
  //                   ...q,
  //                   answerId,
  //                 } as PayloadCreateAnswerDetailInterface)
  //               )
  //             );
  //           }
  //         })
  //       );

  //       return await fetchAssessmentById(assessmentId);
  //     } catch (error) {
  //       throw safeWrapError(error);
  //     }
  //   },
  //   [createAnswer, createAnswerDetail, createAssessment, fetchAssessmentById]
  // );

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

  // UPDATE FINAL ASSESSMENT
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

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        for (const [_, pc] of payloadAnswers.entries()) {
          const { id: payloadAnsId, answerDetails: payloadAnswerDetails = [], ...answerFields } = pc as any;

          // CASE A: update existing answers
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
                    // create answer details for this existing answers
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

          // CASE B: create new answer + details
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
            // eslint-disable-next-line no-empty
          } catch (e) {}
        }

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [createAnswer, createAnswerDetail, fetchAssessmentById, updateAnswer, updateAnswerDetail, updateAssessment]
  );

  // DELETE FINAL ASSESSMENT
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

  // CLEANUP ON UNMONT
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const hasNext = page < Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
  const hasPrev = page > 1;

  return {
    finalAssessmentsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
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
