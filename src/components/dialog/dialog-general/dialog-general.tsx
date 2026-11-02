import { useEffect, useRef, forwardRef, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';
// hooks
import { UseBooleanInterface } from '/src/hooks/use-boolean';

// ----------------------------------------------------------------------

interface DialogProps {
  state: UseBooleanInterface;
  children: ReactNode;
  centered?: boolean;
  scrollable?: boolean;
  className?: string;
  containerClassName?: string;
}

// ----------------------------------------------------------------------

const DialogGeneral = forwardRef<HTMLDivElement, DialogProps>(({ state, className, containerClassName, centered = false, scrollable = true, children, ...props }, ref) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ON CLICK OUTSIDE & PREVENT SCROLLING
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        state.onFalse();
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        state.onFalse();
      }
    };

    if (state.value) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = scrollable ? '' : 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [state, scrollable]);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {state.value && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-[1000] bg-black/50" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={twMerge('fixed z-[1001]', centered && 'left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]', containerClassName)}
          >
            <motion.div
              ref={ref || dialogRef}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className={twMerge('max-h-[70vh] w-[340px] overflow-y-auto rounded-lg border bg-white p-6 shadow-md drop-shadow-md md:w-[600px]', className)}
              {...props}
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.getElementById('root')!
  );
});

export default DialogGeneral;
