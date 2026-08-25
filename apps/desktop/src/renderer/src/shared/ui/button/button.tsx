import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

import type { IconName } from '../icon/icon';

import { Icon } from '../icon/icon';

const variants = {
  primary: 'push-button-primary focus-ring-fill',
  ink: 'push-button-ink focus-ring-fill',
  secondary: 'push-button focus-ring',
  danger:
    'push-button border-danger bg-danger text-highlight-ink focus-ring-fill hover:bg-danger/90 active:bg-danger/80',
  'danger-secondary':
    'inline-flex h-button items-center justify-center gap-1.5 rounded-control bg-danger/10 px-3.25 text-center text-control font-medium text-danger-ink focus-ring hover:bg-danger/15 active:bg-danger/20',
  'icon-secondary':
    'inline-flex size-5.5 items-center justify-center rounded-control bg-transparent text-ink-secondary focus-ring hover:bg-surface-hover active:bg-surface-pressed',
} as const;

type ButtonProps = {
  children?: ReactNode;
  onPress?: (() => void) | undefined;
  variant?: keyof typeof variants;
  fullWidth?: boolean;
  glyph?: IconName | undefined;
  glyphClassName?: string | undefined;
  ref?: Ref<HTMLButtonElement>;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'disabled' | 'type'>;

function buttonClasses(variant: keyof typeof variants, fullWidth: boolean): string {
  return `${variants[variant]} ${fullWidth ? 'w-full' : ''}`;
}

function buttonGlyph(glyph: IconName | undefined, glyphClassName: string): ReactNode {
  return glyph === undefined ? null : (
    <Icon className={`size-3.5 shrink-0 ${glyphClassName}`} name={glyph} />
  );
}

/** The shared button, with one variant per interaction treatment the app uses. */
export function Button({
  children,
  onPress,
  variant = 'secondary',
  fullWidth = false,
  glyph,
  glyphClassName = '',
  ref,
  type = 'button',
  'aria-label': ariaLabel,
  disabled,
}: ButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={buttonClasses(variant, fullWidth)}
      disabled={disabled}
      onClick={onPress}
      ref={ref}
      type={type}
    >
      {buttonGlyph(glyph, glyphClassName)}
      {children}
    </button>
  );
}
