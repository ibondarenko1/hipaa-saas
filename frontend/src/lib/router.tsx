import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
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
import AuditLog from '../pages/internal/AuditLog'

// Pages — Client
import ClientOverview from '../pages/client/Overview'
import ClientAssessment from '../pages/client/Assessment'
import ClientEvidence from '../pages/client/Evidence'
import ClientReports from '../pages/client/Reports'

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
  const [tenantName, setTenantName] = useState<string>()
  useEffect(() => {
    if (!tenantId) return
    import('../services/api').then(({ tenantsApi }) => {
      tenantsApi.get(tenantId).then(r => setTenantName(r.data.name)).catch(() => {})
    })
  }, [tenantId])
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
      <Route path="/" element={<RootRedirect />} />

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
        <Route path="reports" element={<InternalReports />} />
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
        <Route path="assessment" element={<ClientAssessment />} />
        <Route path="evidence" element={<ClientEvidence />} />
        <Route path="reports" element={<ClientReports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
