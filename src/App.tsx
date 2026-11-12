import React from 'react';
// hooks
import { useScrollToTop } from '/src/hooks/use-scroll-to-top';
// context
import { UserProvider } from '/src/context/user';
import { FormProvider } from '/src/context/form';
// routes
import Router from '/src/routes/sections';
// components
import { SnackbarProvider } from '/src/components/snackbar';

// ----------------------------------------------------------------------

const App: React.FC = () => {
  useScrollToTop();

  return (
    <SnackbarProvider>
      <UserProvider>
        <FormProvider>
          <Router />
        </FormProvider>
      </UserProvider>
    </SnackbarProvider>
  );
};

export default App;
