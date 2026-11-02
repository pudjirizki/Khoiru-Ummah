import React, { useRef } from 'react';
import { Icon } from '@iconify/react';
import { SnackbarProvider as NotistackProvider, closeSnackbar } from 'notistack';
// hooks
import { useResponsive } from '/src/hooks/use-responsive';

// ----------------------------------------------------------------------

interface SnackbarProviderProps {
  children: React.ReactNode;
}

// ----------------------------------------------------------------------

const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const notistackRef = useRef(null);

  const { lgUp } = useResponsive();

  return (
    <NotistackProvider
      ref={notistackRef}
      maxSnack={5}
      autoHideDuration={4000}
      variant="success"
      style={{
        fontSize: lgUp ? '14px' : '12px',
        color: '#000',
        fontWeight: '600',
        fontFamily: "Poppins, 'sans-serif'",
        borderRadius: '6px',
        background: 'linear-gradient(to bottom right, rgba(255, 255, 255, 1), rgba(255, 255, 255, 1), rgba(255, 255, 255, 1))',
      }}
      anchorOrigin={{ vertical: 'top', horizontal: lgUp ? 'right' : 'center' }}
      iconVariant={{
        info: (
          <span className="mr-2 text-cyan-500">
            <Icon icon="eva:info-fill" width={20} />
          </span>
        ),
        success: (
          <span className="mr-2 text-emerald-500">
            <Icon icon="eva:checkmark-circle-2-fill" width={20} />
          </span>
        ),
        warning: (
          <span className="mr-2 text-amber-500">
            <Icon icon="eva:alert-triangle-fill" width={20} />
          </span>
        ),
        error: (
          <span className="mr-2 text-rose-500">
            <Icon icon="solar:danger-bold" width={20} />
          </span>
        ),
      }}
      action={(snackbarId) => (
        <button type="button" onClick={() => closeSnackbar(snackbarId)} className="p-1">
          <Icon width={16} icon="mingcute:close-line" />
        </button>
      )}
    >
      {children}
    </NotistackProvider>
  );
};

export default SnackbarProvider;
