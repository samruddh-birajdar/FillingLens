import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Chat from './Chat'
import InvoiceReview from './InvoiceReview'
import InvoiceDetail from './InvoiceDetail'

const serif = "font-['Newsreader',Georgia,serif]"
const sans = "font-['Instrument_Sans',system-ui,sans-serif]"
const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D4C]'

function BrandMark({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div style={{ width: size, height: size }} className={`rounded-lg flex items-center justify-center ${serif} font-semibold italic ${dark ? 'bg-[#0F1A2B] text-[#D9BE8A]' : 'bg-[#F5F6F8] text-[#0F1A2B]'}`}>
      <span style={{ fontSize: size * 0.55 }}>F</span>
    </div>
  )
}

function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const { error } = mode === 'signup' ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg({ text: error.message, error: true })
    else if (mode === 'signup') setMsg({ text: 'Account created. Confirm your email, then sign in.', error: false })
    setLoading(false)
  }

  const inputCls = `w-full px-4 py-3 rounded-lg bg-white border border-[#E3E6EB] text-[15px] text-[#0F1A2B] placeholder:text-[#9AA2AF] transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D4C] focus:border-transparent`

  return (
    <div className={`min-h-dvh grid lg:grid-cols-[1.1fr_1fr] bg-[#F5F6F8] ${sans}`}>
      <div className="hidden lg:flex flex-col justify-between bg-[#0F1A2B] p-14 text-white" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 39px, rgba(255,255,255,0.04) 39px, rgba(255,255,255,0.04) 40px)' }}>
        <div className="flex items-center gap-3"><BrandMark /><span className={`${serif} text-xl tracking-tight`}>FillingLens</span></div>
        <div>
          <div className="h-px w-16 bg-[#B08D4C] mb-8" />
          <h1 className={`${serif} text-5xl leading-[1.1] font-medium tracking-tight max-w-lg`}>Read the filing the way an analyst would.</h1>
          <p className="mt-6 text-[17px] leading-relaxed text-slate-400 max-w-md">Ask in plain language. Every answer shows the passage it came from.</p>
        </div>
        <p className="text-sm text-slate-500">Built on SEC filings.</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10"><BrandMark dark /><span className={`${serif} text-xl text-[#0F1A2B]`}>FillingLens</span></div>
          <h2 className={`${serif} text-3xl font-medium text-[#0F1A2B] tracking-tight`}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-2 text-[15px] text-[#6B7482]">{mode === 'signin' ? 'Sign in to continue your research.' : 'Takes ten seconds. No card needed.'}</p>
          <form className="mt-8 space-y-3" onSubmit={submit}>
            <input type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
            <div className="relative">
              <input type={show ? 'text' : 'password'} required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={`${inputCls} pr-12`} />
              <button type="button" onClick={() => setShow(s => !s)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-[#6B7482] hover:text-[#0F1A2B] ${ring}`}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            <button type="submit" disabled={loading} className={`w-full mt-2 bg-[#0F1A2B] hover:bg-[#1B2A42] text-white font-medium py-3 rounded-lg text-[15px] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${ring} focus-visible:ring-offset-2`}>
              {loading && <Loader2 size={15} className="motion-safe:animate-spin" />} {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <p className="mt-6 text-sm text-[#6B7482]">{mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}<button type="button" onClick={() => { setMode(m => (m === 'signin' ? 'signup' : 'signin')); setMsg(null) }} className={`font-medium text-[#0F1A2B] underline underline-offset-4 decoration-[#B08D4C] rounded ${ring}`}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p>
          {msg && <p className={`mt-5 text-sm leading-relaxed ${msg.error ? 'text-red-700' : 'text-[#6B7482]'}`}>{msg.text}</p>}
        </div>
      </div>
    </div>
  )
}

function NavButton({ to, label, active }: { to: string, label: string, active: boolean }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-[#F5F6F8] text-[#0F1A2B]' : 'text-[#6B7482] hover:bg-gray-50'}`}
    >
      {label}
    </Link>
  )
}

function AppShell({ session }: { session: Session }) {
  const location = useLocation()
  const isInvoice = location.pathname.startsWith('/invoice')

  return (
    <div className="flex flex-col h-dvh bg-[#F5F6F8]">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#E3E6EB] shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-semibold text-[#0F1A2B]">
            <BrandMark size={24} /> FillingLens
          </div>
          <div className="flex gap-2">
            <NavButton to="/chat" label="Document Chat" active={!isInvoice} />
            <NavButton to="/invoice" label="Invoice Review" active={isInvoice} />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/chat" element={<Chat session={session} />} />
          <Route path="/invoice" element={<div className="h-full overflow-y-auto"><InvoiceReview /></div>} />
          <Route path="/invoice/:id" element={<InvoiceDetail />} />
          <Route path="*" element={<Navigate to="/invoice" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return <div className="min-h-dvh bg-[#F5F6F8]" />
  if (!session) return <Login />

  // WRAP THE ENTIRE SHELL IN BROWSERROUTER
  return (
    <BrowserRouter>
      <AppShell session={session} />
    </BrowserRouter>
  )
}