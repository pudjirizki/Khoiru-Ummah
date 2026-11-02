import { createContext, useContext } from 'react';
//
import { UseUserContextProps } from './user-provider';

// ----------------------------------------------------------------------

export const UserContext = createContext<UseUserContextProps | null>(null);

export const useUserContext = (): UseUserContextProps => {
  const context = useContext(UserContext);

  if (!context) throw new Error('useUserContext must be use inside UserProvider');

  return context;
};
