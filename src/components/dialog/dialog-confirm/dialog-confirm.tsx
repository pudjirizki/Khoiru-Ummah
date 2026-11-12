import React, { ReactNode, useCallback, useRef } from 'react';
// components
import { Button } from '/src/components/button';

// ----------------------------------------------------------------------

interface DialogConfirmProps {
  label: ReactNode;
  title?: string;
  action: () => void;
}

// ----------------------------------------------------------------------

const DialogConfirm: React.FC<DialogConfirmProps> = ({ label, title, action }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleOpenDialog = useCallback(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleCloseDialog = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const handleClickConfirm = useCallback(async () => {
    await action();
    dialogRef.current?.close();
  }, [action]);

  return (
    <>
      <Button type="button" variant="gost" onClick={handleOpenDialog}>
        {label}
      </Button>

      <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box bg-white">
          <h3 className="text-center text-lg font-semibold">{title || 'Confirm Dialog'}</h3>

          <div className="mt-5 flex flex-row items-center justify-center gap-5">
            <Button onClick={handleClickConfirm} className="w-full">
              Konfirmasi
            </Button>

            <Button onClick={handleCloseDialog} className="w-full bg-neutral-400 hover:bg-neutral-400/80">
              Keluar
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
};

export default DialogConfirm;
