import { ChevronRight, LoaderCircle } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'

import { cx } from '../lib/cx'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'light'
export type Size = 'sm' | 'md' | 'lg'
export type Force = 'hover' | 'focus' | 'pressed'

// `data-force` pins a state for the style guide; each selector mirrors :hover, :focus-visible or :active.
const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.01em] transition-[background-color,color,box-shadow,transform,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] active:scale-[0.97] data-[force=pressed]:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 data-[force=focus]:outline-[2.5px] data-[force=focus]:outline-offset-3 data-[force=focus]:outline-ink'

export const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white shadow-[var(--shadow-button)] hover:bg-ink-2 data-[force=hover]:bg-ink-2 data-[force=pressed]:bg-ink-2',
  secondary: 'border border-line-strong bg-paper text-ink hover:border-ink data-[force=hover]:border-ink data-[force=pressed]:bg-sand',
  ghost: 'text-ink hover:bg-ink/5 data-[force=hover]:bg-ink/5 data-[force=pressed]:bg-ink/10',
  light: 'bg-paper text-ink shadow-[var(--shadow-card)] hover:bg-sand data-[force=hover]:bg-sand data-[force=pressed]:bg-sand',
}

export const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-[0.875rem]',
  md: 'h-12 px-6 text-[0.95rem]',
  lg: 'h-14 px-7 text-base',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode; force?: Force }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, force, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} data-force={force} disabled={disabled || loading} aria-busy={loading || undefined} className={cx(base, variants[variant], sizes[size], className)} {...rest}>
      {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
})

export function ButtonLink({ variant = 'primary', size = 'md', className, children, icon, force, ...rest }: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode; force?: Force }) {
  return (
    <Link data-force={force} className={cx(base, variants[variant], sizes[size], className)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}

/** The reference's dark pill with a grey chevron disc on the right ("Book a call ›"). */
const arrowSizes = {
  md: { pill: 'h-[52px] gap-4 pl-6 pr-1.5 text-[0.9375rem]', disc: 'size-10', icon: 'size-5' },
  lg: { pill: 'h-[68px] gap-5 pl-6 pr-2 text-[1rem]', disc: 'size-[52px]', icon: 'size-6' },
}

function ArrowInner({ children, size, loading }: { children: ReactNode; size: 'md' | 'lg'; loading?: boolean }) {
  const s = arrowSizes[size]
  return (
    <>
      <span>{children}</span>
      <span aria-hidden className={cx('round grid place-items-center rounded-full bg-disc text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-spring)] group-hover:translate-x-0.5 group-data-[force=hover]:translate-x-0.5', s.disc)}>
        {loading ? <LoaderCircle className={cx('animate-spin', s.icon)} /> : <ChevronRight className={s.icon} strokeWidth={2.4} />}
      </span>
    </>
  )
}

const arrowBase =
  'group inline-flex select-none items-center rounded-full font-semibold tracking-[-0.01em] shadow-[var(--shadow-button)] transition-[background-color,transform] duration-[var(--duration-fast)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 data-[force=pressed]:scale-[0.98] data-[force=focus]:outline-[2.5px] data-[force=focus]:outline-offset-3 data-[force=focus]:outline-ink'
const arrowTones = {
  dark: 'bg-ink text-white hover:bg-ink-2 data-[force=hover]:bg-ink-2',
  light: 'bg-paper text-ink hover:bg-sand data-[force=hover]:bg-sand',
}
type Tone = keyof typeof arrowTones

export function ArrowLink({ children, size = 'md', tone = 'dark', className, force, ...rest }: LinkProps & { size?: 'md' | 'lg'; tone?: Tone; force?: Force }) {
  return (
    <Link data-force={force} className={cx(arrowBase, arrowTones[tone], arrowSizes[size].pill, className)} {...rest}>
      <ArrowInner size={size}>{children}</ArrowInner>
    </Link>
  )
}

export function ArrowButton({ children, size = 'md', tone = 'dark', className, force, loading, disabled, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'md' | 'lg'; tone?: Tone; force?: Force; loading?: boolean }) {
  return (
    <button type={type} data-force={force} disabled={disabled || loading} aria-busy={loading || undefined} className={cx(arrowBase, arrowTones[tone], arrowSizes[size].pill, className)} {...rest}>
      <ArrowInner size={size} loading={loading}>
        {children}
      </ArrowInner>
    </button>
  )
}

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string; tone?: 'soft' | 'ghost' | 'dark'; force?: Force }>(function IconButton({ className, tone = 'soft', force, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      data-force={force}
      className={cx(
        'round inline-grid size-11 shrink-0 place-items-center rounded-full transition-[background-color,transform] duration-[var(--duration-fast)] active:scale-95 disabled:opacity-40 data-[force=pressed]:scale-95 data-[force=focus]:outline-[2.5px] data-[force=focus]:outline-offset-3 data-[force=focus]:outline-ink',
        tone === 'soft' && 'bg-ink/5 text-ink hover:bg-ink/10 data-[force=hover]:bg-ink/10',
        tone === 'ghost' && 'text-ink hover:bg-ink/5 data-[force=hover]:bg-ink/5',
        tone === 'dark' && 'bg-ink text-white hover:bg-ink-2 data-[force=hover]:bg-ink-2',
        className,
      )}
      {...rest}
    />
  )
})
