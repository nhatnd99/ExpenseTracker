import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { Providers } from './providers'
import { UpdateNotification } from '@/components/ui/UpdateNotification'

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
      <UpdateNotification />
    </Providers>
  )
}
