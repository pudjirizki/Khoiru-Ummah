import React, { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';
// hooks
import { UseFinalFormInterface } from '/src/hooks/use-final-form';
// interfaces
import { StudentInterface } from '/src/interfaces/student';

// ----------------------------------------------------------------------

interface TotalFormProps {
  selectedStudent: StudentInterface | null;
  forms: UseFinalFormInterface['allFinalFormsCache'];
  className?: string;
}

// ----------------------------------------------------------------------

const TotalForm: React.FC<TotalFormProps> = ({ selectedStudent, forms, className }) => {
  const formsByClass = useMemo(() => {
    const map = new Map<string, typeof forms>();

    for (const f of forms) {
      for (const cls of f.class) {
        if (!map.has(cls)) {
          map.set(cls, []);
        }
        map.get(cls)!.push(f);
      }
    }

    return map;
  }, [forms]);

  const displayCount = selectedStudent?.id ? (formsByClass.get(selectedStudent.class)?.length ?? 0) : forms.length;

  return (
    <div className={twMerge(`relative overflow-hidden rounded-2xl bg-primary-1 p-5 font-poppins shadow-md`, className)}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">Total Formulir</p>

            <p className="text-xs text-white/60">Form yang tersedia</p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <Icon icon="mdi:form" className="text-2xl text-white" />
          </div>
        </div>

        <div>
          <p className="text-5xl font-bold leading-none text-white">{displayCount}</p>

          <p className="mt-2 text-sm text-white/80">{selectedStudent?.name ? `Untuk ${selectedStudent.name}` : 'Seluruh siswa'}</p>
        </div>
      </div>
    </div>
  );
};

export default TotalForm;
