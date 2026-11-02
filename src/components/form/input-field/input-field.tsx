import React, { forwardRef, HTMLInputTypeAttribute } from 'react';
import { twMerge } from 'tailwind-merge';

// ----------------------------------------------------------------------

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  label?: string;
  containerClassname?: string;
  inputClassname?: string;
  labelClassname?: string;
  // ONLY INPUT FILE
  fileName?: string;
  // ONLY INPUT CHECKBOX
  checkboxLabel?: string;
  checkboxLabelClassname?: string;
  // ONLY INPUT RADIO
  radioLabel?: string;
  radioLabelClassname?: string;
}

// ----------------------------------------------------------------------

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, placeholder, fileName, checkboxLabel, radioLabel, containerClassname, inputClassname, labelClassname, checkboxLabelClassname, radioLabelClassname, type = 'text', ...props }, ref) => {
    // INPUT FILE
    if (type === 'file') {
      return (
        <label className={twMerge('form-control w-full gap-2', containerClassname)}>
          {label && <span className={twMerge('text-sm text-[#404040]', labelClassname)}>{label}</span>}

          <div
            className={twMerge(
              'w-full cursor-pointer rounded-md border border-[#DEDEDE] bg-[#FAFAFA] px-3 py-4 text-sm leading-none ring-primary-1 transition-all duration-300 placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2',
              inputClassname
            )}
          >
            {fileName ? <span className="text-white">{fileName}</span> : <span className="text-[#A8A8A8]">{placeholder || 'Select file'}</span>}
          </div>

          <input ref={ref} type="file" className="hidden" {...props} />
        </label>
      );
    }

    // INPUT CHECKBOX
    if (type === 'checkbox') {
      return (
        <label className={twMerge('form-control w-fit cursor-pointer gap-2', containerClassname)}>
          {label && <span className={twMerge('text-sm text-[#404040]', labelClassname)}>{label}</span>}

          <div className="flex flex-row items-center gap-2">
            <input ref={ref} type="checkbox" className={twMerge('checkbox', inputClassname)} {...props} />

            {checkboxLabel && <span className={twMerge('text-sm leading-none', checkboxLabelClassname)}>{checkboxLabel}</span>}
          </div>
        </label>
      );
    }

    // INPUT RADIO
    if (type === 'radio') {
      return (
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            className="relative h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-gray-500 transition-colors checked:border-primary-1 checked:bg-primary-1"
            {...props}
          />

          {radioLabel && <span className="text-sm leading-none">{radioLabel}</span>}
        </label>
      );
    }

    // OTHER INPUT
    return (
      <label className={twMerge('form-control w-full gap-2', containerClassname)}>
        {label && <span className={twMerge('text-sm text-[#404040]', labelClassname)}>{label}</span>}

        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className={twMerge(
            'w-full rounded-md border border-[#DEDEDE] bg-[#FAFAFA] p-3 text-sm leading-none ring-primary-1 transition-all duration-300 placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-300',
            inputClassname
          )}
          {...props}
        />
      </label>
    );
  }
);

export default InputField;
