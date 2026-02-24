import React, { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, FileText, ShieldCheck,
  Users, Building2, ChevronRight, LogOut, Bell,
  AlertTriangle, Activity, Settings, ChevronDown, FileSearch,
  BarChart3, CheckSquare, FolderOpen, GraduationCap, FileCheck
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { NotificationBell } from '../NotificationBell'
import clsx from 'clsx'

// ── Logo ───────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px' }}>
      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0"
        style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#2563eb', boxShadow: '0 0 16px rgba(59,130,246,0.4)' }}>
        <ShieldCheck className="w-4.5 h-4.5 text-white" size={18} style={{ color: '#fff' }} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-100 leading-none" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Summit Range</p>
        <p className="text-xs text-slate-500 mt-0.5" style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>HIPAA Platform</p>
      </div>
    </div>
  )
}

// ── Nav Item ───────────────────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, exact }: {
  to: string
  icon: React.ElementType
  label: string
  exact?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        clsx(isActive ? 'nav-item-active' : 'nav-item')
      }
      style={({ isActive }) => ({ color: isActive ? '#60a5fa' : '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, fontSize: 14 })}
    >
      <Icon size={16} className="flex-shrink-0" style={{ flexShrink: 0 }} />
      <span>{label}</span>
    </NavLink>
  )
}

// ── Tenant Selector ────────────────────────────────────────────────────────────
function TenantSelector({ tenantId, tenantName }: { tenantId?: string; tenantName?: string }) {
  if (!tenantId) return null
  return (
    <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-blue-500/06 border border-blue-500/12">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Active Tenant</p>
      <p className="text-sm font-medium text-slate-300 truncate">{tenantName || tenantId.slice(0, 8)}</p>
    </div>
  )
}

// ── Internal Sidebar ───────────────────────────────────────────────────────────
function InternalSidebar() {
  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto" style={{ flex: 1, padding: '8px 12px', color: '#94a3b8' }}>
      <p className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider" style={{ margin: 0, padding: '8px 12px 4px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        Operations
      </p>
      <NavItem to="/internal" icon={LayoutDashboard} label="Dashboard" exact />
      <NavItem to="/internal/tenants" icon={Building2} label="Clients" />
      <NavItem to="/internal/evidence-review" icon={FileCheck} label="Evidence Review" />
      <NavItem to="/internal/assessments" icon={ClipboardList} label="Assessments" />

      <p className="px-3 pt-4 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider" style={{ margin: 0, padding: '16px 12px 4px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        Analysis
      </p>
      <NavItem to="/internal/results" icon={Activity} label="Engine Results" />
      <NavItem to="/internal/reports" icon={FileText} label="Reports" />
      <NavItem to="/internal/communications" icon={Bell} label="Communications" />

      <p className="px-3 pt-4 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider" style={{ margin: 0, padding: '16px 12px 4px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        Tools
      </p>
      <NavItem to="/internal/training-status" icon={GraduationCap} label="Training Status" />
      <NavItem to="/internal/sra" icon={BarChart3} label="SRA Assessment" />
      <NavItem to="/internal/evidence-checklist" icon={CheckSquare} label="Evidence Checklist" />

      <p className="px-3 pt-4 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider" style={{ margin: 0, padding: '16px 12px 4px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        Admin
      </p>
      <NavItem to="/internal/audit" icon={FileSearch} label="Audit Log" />
    </nav>
  )
}

// ── Client Sidebar ─────────────────────────────────────────────────────────────
function ClientSidebar({ tenantId }: { tenantId: string }) {
  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
      <NavItem to={`/client/${tenantId}`} icon={LayoutDashboard} label="Dashboard" exact />
      <NavItem to={`/client/${tenantId}/assessment`} icon={ClipboardList} label="Assessment" />
      <NavItem to={`/client/${tenantId}/evidence`} icon={FolderOpen} label="Evidence Vault" />
      <NavItem to={`/client/${tenantId}/training`} icon={GraduationCap} label="Training" />
      <NavItem to={`/client/${tenantId}/workforce`} icon={Users} label="Workforce" />
      <NavItem to={`/client/${tenantId}/reports`} icon={ShieldCheck} label="Reports" />
      <NavItem to={`/client/${tenantId}/settings`} icon={Settings} label="Settings" />
    </nav>
  )
}

// ── User Footer ────────────────────────────────────────────────────────────────
function UserFooter() {
  const { user, logout } = useAuth()
  return (
    <div className="p-3 border-t border-blue-500/08" style={{ padding: 12, borderTop: '1px solid rgba(59,130,246,0.12)', color: '#e2e8f0' }}>
      <div className="flex items-center gap-3 px-2 py-2" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px' }}>
        <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center flex-shrink-0" style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: 12, fontWeight: 700 }}>
          {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0" style={{ flex: 1, minWidth: 0 }}>
          <p className="text-xs font-medium text-slate-300 truncate" style={{ margin: 0, fontSize: 12, color: '#cbd5e1' }}>
            {user?.full_name || user?.email}
          </p>
          <p className="text-xs text-slate-600 truncate" style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex-shrink-0 p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Topbar ─────────────────────────────────────────────────────────────────────
function Topbar({ title, subtitle, tenantId }: { title?: string; subtitle?: string; tenantId?: string }) {
  return (
    <header
      className="h-14 flex items-center justify-between px-6 border-b border-blue-500/08 flex-shrink-0"
      style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 24, borderBottom: '1px solid rgba(59,130,246,0.12)', flexShrink: 0, backgroundColor: '#050d1a', color: '#e2e8f0' }}
    >
      <div>
        {title && <h1 className="text-sm font-semibold text-slate-200" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{title}</h1>}
        {subtitle && <p className="text-xs text-slate-500" style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {tenantId ? (
          <NotificationBell tenantId={tenantId} />
        ) : (
          <button className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors relative" aria-hidden>
            <Bell size={16} />
          </button>
        )}
      </div>
    </header>
  )
}

const layoutStyles = {
  wrapper: { display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#050d1a', color: '#e2e8f0' as const },
  sidebar: { width: 224, flexShrink: 0, display: 'flex', flexDirection: 'column' as const, backgroundColor: '#0a1628', borderRight: '1px solid rgba(59,130,246,0.15)' },
  main: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', backgroundColor: '#050d1a' },
  mainContent: { flex: 1, overflowY: 'auto' as const, padding: 24 },
}

// ── Internal Layout ────────────────────────────────────────────────────────────
export function InternalLayout() {
  const { user } = useAuth()
  return (
    <div className="flex h-screen overflow-hidden bg-navy-950" style={layoutStyles.wrapper}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-navy-900 border-r border-blue-500/08" style={layoutStyles.sidebar}>
        <Logo />
        <div className="divider mx-3 my-0" />
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600/10 border border-blue-500/20 w-fit">
            <ShieldCheck size={10} className="text-blue-400" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Internal</span>
          </div>
        </div>
        <InternalSidebar />
        <UserFooter />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden" style={layoutStyles.main}>
        <Topbar subtitle="Compliance pipeline · Client data → Gap analysis → Remediation → Report" />
        <div className="flex-1 overflow-y-auto" style={layoutStyles.mainContent}>
          <div className="p-6 animate-fade-in" style={{ padding: 24 }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Client Layout ──────────────────────────────────────────────────────────────
export function ClientLayout({ tenantId, tenantName }: {
  tenantId: string
  tenantName?: string
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-navy-950" style={layoutStyles.wrapper}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-navy-900 border-r border-blue-500/08" style={layoutStyles.sidebar}>
        <Logo />
        <div className="divider mx-3 my-0" />
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600/10 border border-emerald-500/20 w-fit">
            <ShieldCheck size={10} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Client</span>
          </div>
        </div>
        <TenantSelector tenantId={tenantId} tenantName={tenantName} />
        <ClientSidebar tenantId={tenantId} />
        <UserFooter />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden" style={layoutStyles.main}>
        <Topbar subtitle={tenantName ? `${tenantName} — Client Portal` : 'Client Portal'} tenantId={tenantId} />
        <div className="flex-1 overflow-y-auto" style={layoutStyles.mainContent}>
          <div className="p-6 animate-fade-in" style={{ padding: 24 }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
