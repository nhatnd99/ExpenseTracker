interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function LoadingSpinner({ size = 'md', label = 'Loading…' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-[3px]',
  }

  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-label={label}>
      <div
        className={`animate-spin rounded-full border-slate-200 border-t-slate-900 dark:border-slate-800 dark:border-t-cyan-400 ${sizeClasses[size]}`}
      />
      {label && <p className="text-xs font-medium text-slate-400 dark:text-slate-400">{label}</p>}
    </div>
  )
}
