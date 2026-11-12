import React from 'react';
import { twMerge } from 'tailwind-merge';
import { FieldErrors } from 'react-hook-form';
import { ErrorMessage as EMValdiation } from '@hookform/error-message';

// ----------------------------------------------------------------------

export interface ErrorMessageProps {
  errors: FieldErrors<FormData>;
  name: string;
  className?: string;
}

// ----------------------------------------------------------------------

const ErrorMessage: React.FC<ErrorMessageProps> = ({ errors, name, className }) => {
  return (
    <EMValdiation
      errors={errors}
      name={name}
      render={({ messages }) =>
        messages &&
        Object.entries(messages).map(([type, message]) => (
          <p key={type} className={twMerge('pl-1 text-xs font-medium italic text-red-500', className)}>
            {message}
          </p>
        ))
      }
    />
  );
};

export default ErrorMessage;
