import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import AdminRoute from '@/components/shared/AdminRoute'
import AppLayout from '@/components/layout/AppLayout'
import PageSpinner from '@/components/shared/PageSpinner'

const LoginPage            = lazy(() => import('@/pages/auth/LoginPage'))
const ResetPasswordPage    = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const DashboardPage   = lazy(() => import('@/pages/dashboard/DashboardPage'))
const JobsPage        = lazy(() => import('@/pages/jobs/JobsPage'))
const CandidatesPage  = lazy(() => import('@/pages/candidates/CandidatesPage'))
const CandidateDetail = lazy(() => import('@/pages/candidates/CandidateDetailPage'))
const KanbanPage      = lazy(() => import('@/pages/kanban/KanbanPage'))
const AccountsPage    = lazy(() => import('@/pages/admin/AccountsPage'))

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard"      element={<DashboardPage />} />
                  <Route path="/jobs"           element={<JobsPage />} />
                  <Route path="/candidates"     element={<CandidatesPage />} />
                  <Route path="/candidates/:id" element={<CandidateDetail />} />
                  <Route path="/kanban"         element={<KanbanPage />} />

                  <Route element={<AdminRoute />}>
                    <Route path="/admin/accounts" element={<AccountsPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>

          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1A1D2B',
                color: '#F1F5F9',
                border: '1px solid #252836',
                borderRadius: '8px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#22C55E', secondary: '#1A1D2B' } },
              error:   { iconTheme: { primary: '#F43F5E', secondary: '#1A1D2B' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
