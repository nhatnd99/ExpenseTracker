import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-slate-400">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Go to Dashboard</span>
      </Link>
    </div>
  )
}
