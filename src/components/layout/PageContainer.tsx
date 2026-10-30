interface PageContainerProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`mx-auto max-w-lg px-4 py-4 w-full min-w-0 box-border ${className}`}>
      {children}
    </div>
  )
}

