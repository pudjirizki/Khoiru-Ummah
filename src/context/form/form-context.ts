import { createContext, useContext } from 'react';
//
import { UseFormContextProps } from './form-provider';

// ----------------------------------------------------------------------

export const FormContext = createContext<UseFormContextProps | null>(null);

export const useFormContext = (): UseFormContextProps => {
  const context = useContext(FormContext);

  if (!context) throw new Error('useFormContext must be use inside FormProvider');

  return context;
};
