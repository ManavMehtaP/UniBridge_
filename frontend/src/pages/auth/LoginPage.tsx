import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { errorMessage } from '@/api/client'
import { homePathOf, useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      // The backend resolves the role from the account — no role is sent.
      const res = await authApi.login(email.trim(), password)
      setAuth({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        isFirstLogin: res.user.isFirstLogin ?? false,
      })
      const home = homePathOf(res.user)
      if (res.user.isFirstLogin) {
        toast('Please update your password to continue.', { icon: '🔒' })
        navigate(`${home}/settings/security`, { replace: true })
      } else {
        toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`)
        navigate(home, { replace: true })
      }
    } catch (err) {
      setError(errorMessage(err, 'Invalid credentials. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen w-full"
      style={{
        background: '#DCEBFB url(/assets/login-bg.png) no-repeat left center',
        backgroundSize: 'cover',
      }}
    >
      {/* Left image panel (image baked into background) */}
      <div className="relative hidden flex-1 lg:block" />

      {/* Right form panel */}
      <div
        className="flex w-full items-center justify-center bg-[#F3FAFF] px-6 py-10 lg:w-[610px] lg:flex-none lg:px-10"
        style={{ boxShadow: '-8px 0 40px rgba(15,23,42,0.08)' }}
      >
        <div className="w-full max-w-[360px]">
          <h1 className="text-[28px] font-extrabold tracking-tight text-text-primary">
            Welcome Back!
          </h1>
          <p className="mb-8 mt-1.5 text-sm text-text-muted">
            Sign in to continue to your dashboard
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-sm bg-danger-light px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-[13px] font-bold text-text-primary">
                Email or Enrollment No.
              </label>
              <div className="relative flex items-center">
                <User size={17} className="pointer-events-none absolute left-3.5 text-text-muted" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="Enter your email or enrollment no."
                  className="h-[46px] w-full rounded-[10px] border-[1.5px] border-border bg-[#FAFBFC] pl-[42px] pr-3.5 text-sm text-text-primary outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-bold text-text-primary">Password</label>
              <div className="relative flex items-center">
                <Lock size={17} className="pointer-events-none absolute left-3.5 text-text-muted" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-[46px] w-full rounded-[10px] border-[1.5px] border-border bg-[#FAFBFC] pl-[42px] pr-11 text-sm text-text-primary outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 text-text-muted hover:text-text-secondary"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text-secondary">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-[15px] w-[15px] accent-primary"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => toast('Contact your department admin to reset your password.')}
                className="text-[13px] font-semibold text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-primary py-3.5 text-[14.5px] font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition hover:bg-primary-dark active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight size={16} strokeWidth={2.5} />}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-center text-[13px] text-text-muted">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => toast('Contact your university administrator.')}
              className="font-semibold text-primary hover:underline"
            >
              Contact Administrator
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
