import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-lime text-ink shadow-[0_4px_0_0_#6f9a3a] hover:bg-[#c8ff80] hover:-translate-y-px hover:shadow-[0_5px_0_0_#6f9a3a] active:translate-y-[3px] active:shadow-[0_1px_0_0_#6f9a3a]',
  secondary:
    'bg-ink-700 text-bone border border-ink-500 shadow-[0_3px_0_0_#0b0b11] hover:border-lime/60 hover:text-lime active:translate-y-[2px] active:shadow-[0_1px_0_0_#0b0b11]',
  ghost: 'text-mute hover:text-bone hover:bg-ink-700/60',
  danger:
    'bg-alert/10 text-alert border border-alert/40 hover:bg-alert/20 active:translate-y-[2px]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-14 px-7 text-base gap-2.5 rounded-2xl',
  xl: 'h-20 px-10 text-2xl sm:text-3xl gap-3 rounded-3xl tracking-tight',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex select-none items-center justify-center font-display font-bold transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
