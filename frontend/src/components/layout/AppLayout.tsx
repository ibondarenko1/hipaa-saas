import React, { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, FileText, ShieldCheck,
  Users, Building2, ChevronRight, LogOut, Bell,
  AlertTriangle, Activity, Settings, ChevronDown, FileSearch
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

// ── Logo ───────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4">
      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0"
        style={{ boxShadow: '0 0 16px rgba(59,130,246,0.4)' }}>
        <ShieldCheck className="w-4.5 h-4.5 text-white" size={18} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-100 leading-none">Summit Range</p>
        <p className="text-xs text-slate-500 mt-0.5">HIPAA Platform</p>
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
    >
      <Icon size={16} className="flex-shrink-0" />
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
    <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
      <p className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
        Operations
      </p>
      <NavItem to="/internal" icon={LayoutDashboard} label="Dashboard" exact />
      <NavItem to="/internal/tenants" icon={Building2} label="Clients" />
      <NavItem to="/internal/assessments" icon={ClipboardList} label="Assessments" />

      <p className="px-3 pt-4 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
        Analysis
      </p>
      <NavItem to="/internal/results" icon={Activity} label="Engine Results" />
      <NavItem to="/internal/reports" icon={FileText} label="Reports" />

      <p className="px-3 pt-4 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
      <NavItem to={`/client/${tenantId}`} icon={LayoutDashboard} label="Overview" exact />
      <NavItem to={`/client/${tenantId}/assessment`} icon={ClipboardList} label="Assessment" />
      <NavItem to={`/client/${tenantId}/evidence`} icon={FileText} label="Evidence" />
      <NavItem to={`/client/${tenantId}/reports`} icon={ShieldCheck} label="Reports" />
    </nav>
  )
}

// ── User Footer ────────────────────────────────────────────────────────────────
function UserFooter() {
  const { user, logout } = useAuth()
  return (
    <div className="p-3 border-t border-blue-500/08">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-blue-400">
            {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-300 truncate">
            {user?.full_name || user?.email}
          </p>
          <p className="text-xs text-slate-600 truncate">{user?.email}</p>
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
function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-blue-500/08 flex-shrink-0">
      <div>
        {title && <h1 className="text-sm font-semibold text-slate-200">{title}</h1>}
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors relative">
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}

// ── Internal Layout ────────────────────────────────────────────────────────────
export function InternalLayout() {
  const { user } = useAuth()
  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-navy-900 border-r border-blue-500/08">
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
      <main className="flex-1 flex flex-col overflow-hidden">
        <Topbar subtitle="Summit Range Consulting — Internal Operations" />
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 animate-fade-in">
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
    <div className="flex h-screen overflow-hidden bg-navy-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-navy-900 border-r border-blue-500/08">
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
      <main className="flex-1 flex flex-col overflow-hidden">
        <Topbar subtitle={tenantName ? `${tenantName} — Client Portal` : 'Client Portal'} />
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
