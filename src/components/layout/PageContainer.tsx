interface PageContainerProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`mx-auto max-w-lg px-4 py-5 ${className}`}>
      {children}
    </div>
  )
}

