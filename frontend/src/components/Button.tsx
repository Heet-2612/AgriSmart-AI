import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  const variants: Record<string, string> = {
    primary:
      'bg-[#10B981] text-white hover:bg-[#059669] focus-visible:outline-[#10B981] disabled:bg-[#10B981]',
    outline:
      'border border-[#10B981] text-[#10B981] bg-transparent hover:bg-[#f0fdf4] focus-visible:outline-[#10B981]',
    secondary:
      'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus-visible:outline-slate-600',
    danger:
      'border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 focus-visible:outline-red-600',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
