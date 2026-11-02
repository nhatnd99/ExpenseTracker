import React from 'react'
import { WalletCards } from 'lucide-react'

export interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  withText?: boolean
  title?: string
  subtitle?: string
}

const sizeMap = {
  sm: {
    container: 'h-8 w-8 rounded-xl',
    icon: 'h-4 w-4 stroke-[2]',
    title: 'text-xs font-bold',
    sub: 'text-[9px]',
  },
  md: {
    container: 'h-10 w-10 sm:h-11 sm:w-11 rounded-2xl',
    icon: 'h-5.5 w-5.5 sm:h-6 sm:w-6 stroke-[2.25]',
    title: 'text-base font-extrabold',
    sub: 'text-[10px]',
  },
  lg: {
    container: 'h-12 w-12 sm:h-14 sm:w-14 rounded-2xl sm:rounded-3xl',
    icon: 'h-6 w-6 sm:h-7 sm:w-7 stroke-[2.25]',
    title: 'text-lg sm:text-xl font-extrabold',
    sub: 'text-xs',
  },
  xl: {
    container: 'h-16 w-16 sm:h-20 sm:w-20 rounded-3xl',
    icon: 'h-8 w-8 sm:h-10 sm:w-10 stroke-[2.5]',
    title: 'text-2xl font-black',
    sub: 'text-sm',
  },
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className = '',
  withText = false,
  title,
  subtitle,
}) => {
  const currentSize = sizeMap[size]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex ${currentSize.container} items-center justify-center bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 ring-2 ring-white/10 shrink-0 transition-transform active:scale-95`}
      >
        <WalletCards className={currentSize.icon} />
      </div>
      {withText && (
        <div className="min-w-0">
          <span className={`block ${currentSize.title} text-[var(--color-text-primary)] leading-tight truncate tracking-tight`}>
            {title || 'Expense Tracker'}
          </span>
          {subtitle && (
            <span className={`block ${currentSize.sub} font-bold uppercase tracking-wider text-[var(--color-text-muted)] truncate mt-0.5`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

