import React, { useMemo, useCallback } from 'react';
// hooks
import { useLocalStorage } from '/src/hooks/use-local-storage';
// interfaces
import { TempAssessmentFinalFormInterface, TempGeneralFinalFormInterface } from '/src/interfaces/final-form';
// config-global
import { FORM_KEY } from '/src/config-global';
// utils
import { fEncrypt } from '/src/utils/format-encrypt';
//
import { FormContext } from './form-context';

// ----------------------------------------------------------------------

type Value = string | number | object | boolean | any[] | null;

interface InitialState {
  currentTab: 'general' | 'assessment';
  generalForm: string;
  assessmentForm: string;
}

interface FormProviderProps {
  children: React.ReactNode;
}

export interface UseFormContextProps {
  currentTab: 'general' | 'assessment';
  generalForm: string;
  assessmentForm: string;
  onUpdateCurrentTab: (value: 'general' | 'assessment') => void;
  onUpdateGeneralForm: (payload: TempGeneralFinalFormInterface) => void;
  onUpdateAssessmentForm: (payload: TempAssessmentFinalFormInterface) => void;
  onReset: () => void;
}

// ----------------------------------------------------------------------

const initialState: InitialState = {
  currentTab: 'general',
  generalForm: '',
  assessmentForm: '',
};

// ----------------------------------------------------------------------

export const FormProvider: React.FC<FormProviderProps> = ({ children }) => {
  const { state, update, reset } = useLocalStorage(FORM_KEY, initialState) as { state: InitialState; update: (name: string, updateValue: Value) => void; reset: () => void };

  // ----------------------------------------------------------------------

  // CURRENT TAB
  const onUpdateCurrentTab = useCallback(
    (value: 'general' | 'assessment') => {
      update('currentTab', value);
    },
    [update]
  );

  // GENERAL FORM
  const onUpdateGeneralForm = useCallback(
    (payload: TempGeneralFinalFormInterface) => {
      const encrypted = fEncrypt(payload, FORM_KEY);
      update('generalForm', encrypted);
    },
    [update]
  );

  // ASSESSMENT FORM
  const onUpdateAssessmentForm = useCallback(
    (payload: TempAssessmentFinalFormInterface) => {
      const encrypted = fEncrypt(payload, FORM_KEY);
      update('assessmentForm', encrypted);
    },
    [update]
  );

  // RESET STATE
  const onReset = useCallback(() => {
    reset();
  }, [reset]);

  const memoizedValue = useMemo(
    () => ({
      ...state,
      onUpdateCurrentTab,
      onUpdateGeneralForm,
      onUpdateAssessmentForm,
      onReset,
    }),
    [onUpdateCurrentTab, onUpdateGeneralForm, onUpdateAssessmentForm, onReset, state]
  );

  return <FormContext.Provider value={memoizedValue}>{children}</FormContext.Provider>;
};
