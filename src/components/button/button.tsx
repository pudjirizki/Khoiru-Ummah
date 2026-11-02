import React, { useCallback, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { type VariantProps } from 'class-variance-authority';
// routes
import { useRouter } from '/src/routes/hooks';
//
import { buttonStyles } from './styles';

// ----------------------------------------------------------------------

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  component?: 'RouterLink';
  href?: string;
}

// ----------------------------------------------------------------------

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ type = 'button', href = '', className, variant, fullWidth, shadow, component, ...props }, ref) => {
  const router = useRouter();

  const handleClick = useCallback(() => {
    router.push(href);
  }, [router, href]);

  if (component === 'RouterLink') {
    return <button ref={ref} onClick={handleClick} type={type} className={twMerge(buttonStyles({ variant, fullWidth, shadow }), className)} {...props} />;
  }

  return <button ref={ref} type={type} className={twMerge(buttonStyles({ variant, fullWidth, shadow }), className)} {...props} />;
});

export default Button;
