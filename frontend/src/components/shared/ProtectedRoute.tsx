import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import PageSpinner from './PageSpinner'

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
