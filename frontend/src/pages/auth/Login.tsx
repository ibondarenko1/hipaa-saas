import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../../components/ui'

export default function LoginPage() {
  const { login, memberships } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // Redirect based on role
      const mem = JSON.parse(localStorage.getItem('user') || '{}')?.memberships || []
      const isInternal = mem.some((m: any) => m.role === 'internal_user')
      if (isInternal) {
        navigate('/internal')
      } else {
        const first = mem[0]
        if (first) navigate(`/client/${first.tenant_id}`)
        else navigate('/internal')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Invalid credentials. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]
          bg-blue-600/08 blur-[80px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px]
          bg-blue-900/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4"
            style={{ boxShadow: '0 0 32px rgba(59,130,246,0.4), 0 0 64px rgba(59,130,246,0.15)' }}>
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">HIPAA Readiness Platform</h1>
          <p className="text-sm text-slate-500 mt-1">Summit Range Consulting</p>
        </div>

        {/* Card */}
        <div className="card p-7">
          <h2 className="text-base font-semibold text-slate-200 mb-5">Sign in to your account</h2>

          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/25">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-9 pr-9"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? <Spinner className="w-4 h-4" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-blue-500/08">
            <p className="text-xs text-slate-600 text-center">
              HIPAA-compliant SaaS platform by Summit Range Consulting.<br />
              Unauthorized access is prohibited.
            </p>
          </div>
        </div>

        {/* Demo hint */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600">
            Demo: <span className="font-mono text-slate-500">admin@summitrange.com</span>
          </p>
        </div>
      </div>
    </div>
  )
}
