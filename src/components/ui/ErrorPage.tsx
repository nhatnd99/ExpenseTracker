import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

export function ErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
    ? error.message
    : 'An unexpected error occurred.'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-400 max-w-sm">{message}</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  )
}
