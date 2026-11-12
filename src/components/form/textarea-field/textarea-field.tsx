import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

// ----------------------------------------------------------------------

export interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  containerClassname?: string;
  inputClassname?: string;
  labelClassname?: string;
}

// ----------------------------------------------------------------------

const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(({ label, containerClassname, inputClassname, labelClassname, ...props }, ref) => {
  return (
    <label className={twMerge('form-control w-full gap-2', containerClassname)}>
      {label && <span className={twMerge('text-sm text-[#404040]', labelClassname)}>{label}</span>}

      <textarea
        ref={ref}
        className={twMerge(
          'w-full rounded-md border border-[#DEDEDE] bg-[#FAFAFA] p-3 text-sm leading-none ring-primary-1 transition-all duration-300 placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2',
          inputClassname
        )}
        {...props}
      />
    </label>
  );
});

export default TextareaField;
