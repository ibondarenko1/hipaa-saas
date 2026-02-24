import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useParams, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PageLoader } from '../components/ui'
import { InternalLayout, ClientLayout } from '../components/layout/AppLayout'

// Pages — Auth
import LoginPage from '../pages/auth/Login'

// Pages — Internal
import InternalDashboard from '../pages/internal/Dashboard'
import TenantsList from '../pages/internal/TenantsList'
import TenantDetail from '../pages/internal/TenantDetail'
import EngineResults from '../pages/internal/EngineResults'
import InternalReports from '../pages/internal/Reports'
import EvidenceReview from '../pages/internal/EvidenceReview'
import Communications from '../pages/internal/Communications'
import AuditLog from '../pages/internal/AuditLog'
import SRAAssessment from '../pages/internal/SRAAssessment'
import EvidenceChecklist from '../pages/internal/EvidenceChecklist'

// Pages — Client
import ClientOverview from '../pages/client/Overview'
import ClientAssessment from '../pages/client/Assessment'
import ClientEvidence from '../pages/client/Evidence'
import ClientReports from '../pages/client/Reports'
import ClientOnboarding from '../pages/client/Onboarding'
import ClientTraining from '../pages/client/Training'
import ClientWorkforce from '../pages/client/Workforce'
import ClientSettings from '../pages/client/Settings'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireInternal({ children }: { children: React.ReactNode }) {
  const { isInternal, isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  if (!isInternal) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ClientPortalWrapper() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [tenantName, setTenantName] = useState<string>()
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) return
    setLoadError(null)
    import('../services/api').then(({ tenantsApi }) => {
      tenantsApi.get(tenantId).then((r) => {
        setTenantName(r.data.name)
        setOnboardingComplete(r.data.onboarding_completed !== false)
      }).catch((e: any) => {
        setLoadError(e?.response?.data?.detail || 'Failed to load client')
        setOnboardingComplete(true)
      })
    })
  }, [tenantId])

  const isOnboardingRoute = location.pathname.includes('/onboarding')
  useEffect(() => {
    if (tenantId && onboardingComplete === false && !isOnboardingRoute) {
      navigate(`/client/${tenantId}/onboarding`, { replace: true })
    }
  }, [tenantId, onboardingComplete, isOnboardingRoute, navigate])

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="text-center max-w-md">
          <p className="text-red-400 font-medium">Failed to load client</p>
          <p className="text-slate-400 text-sm mt-2">{loadError}</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 text-sm"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return <ClientLayout tenantId={tenantId!} tenantName={tenantName} />
}

function RootRedirect() {
  const { user, memberships, isLoading, isInternal } = useAuth()
  if (isLoading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (isInternal) return <Navigate to="/internal" replace />
  const first = memberships[0]
  if (first) return <Navigate to={`/client/${first.tenant_id}`} replace />
  return <Navigate to="/login" replace />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<LoginPage />} />

      {/* Internal Portal */}
      <Route
        path="/internal"
        element={
          <RequireAuth>
            <RequireInternal>
              <InternalLayout />
            </RequireInternal>
          </RequireAuth>
        }
      >
        <Route index element={<InternalDashboard />} />
        <Route path="tenants" element={<TenantsList />} />
        <Route path="tenants/:tenantId" element={<TenantDetail />} />
        <Route path="tenants/:tenantId/assessments/:assessmentId/results" element={<EngineResults />} />
        <Route path="assessments" element={<TenantsList />} />
        <Route path="results" element={<TenantsList />} />
        <Route path="evidence-review" element={<EvidenceReview />} />
        <Route path="reports" element={<InternalReports />} />
        <Route path="communications" element={<Communications />} />
        <Route path="sra" element={<SRAAssessment />} />
        <Route path="evidence-checklist" element={<EvidenceChecklist />} />
        <Route path="audit" element={<AuditLog />} />
      </Route>

      {/* Client Portal */}
      <Route
        path="/client/:tenantId"
        element={
          <RequireAuth>
            <ClientPortalWrapper />
          </RequireAuth>
        }
      >
        <Route index element={<ClientOverview />} />
        <Route path="onboarding" element={<ClientOnboarding />} />
        <Route path="assessment" element={<ClientAssessment />} />
        <Route path="evidence" element={<ClientEvidence />} />
        <Route path="training" element={<ClientTraining />} />
        <Route path="workforce" element={<ClientWorkforce />} />
        <Route path="reports" element={<ClientReports />} />
        <Route path="settings" element={<ClientSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
