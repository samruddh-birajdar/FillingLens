import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import ReactMarkdown from 'react-markdown'
import { ArrowUp, LogOut, SquarePen, FileText, Loader2, Eye, EyeOff, Copy, Check, RotateCcw, Upload } from 'lucide-react'
import UploadModal from './UploadModal'

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
const serif = "font-['Newsreader',Georgia,serif]"
const sans = "font-['Instrument_Sans',system-ui,sans-serif]"
const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D4C]'

type Doc = { id: number; name: string }

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: number[]
  error?: boolean
  query?: string
}

const SUGGESTIONS = [
  'Summarize this document in five points.',
  'What are the main risks it mentions?',
  'Which financial figures matter most here?',
]

function BrandMark({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-lg flex items-center justify-center ${serif} font-semibold italic ${
        dark ? 'bg-[#0F1A2B] text-[#D9BE8A]' : 'bg-[#F5F6F8] text-[#0F1A2B]'
      }`}
    >
      <span style={{ fontSize: size * 0.55 }}>F</span>
    </div>
  )
}

function SampleAnswer() {
  return (
    <div className="mt-10 max-w-md rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-slate-400">What was total net sales in fiscal 2023?</p>
      <p className={`${serif} mt-3 text-[19px] leading-[1.6] text-white`}>
        Total net sales were <span className="text-[#D9BE8A]">$383.3 billion</span>, down about 3% from fiscal 2022.
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B08D4C]" />
        Chunk 42, Item 7
      </div>
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
    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg({ text: error.message, error: true })
    else if (mode === 'signup') setMsg({ text: 'Account created. Confirm your email, then sign in.', error: false })
    setLoading(false)
  }

  const inputCls = `w-full px-4 py-3 rounded-lg bg-white border border-[#E3E6EB] text-[15px] text-[#0F1A2B] placeholder:text-[#9AA2AF] transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D4C] focus:border-transparent`

  return (
    <div className={`min-h-dvh grid lg:grid-cols-[1.1fr_1fr] bg-[#F5F6F8] ${sans}`}>
      <div
        className="hidden lg:flex flex-col justify-between bg-[#0F1A2B] p-14 text-white"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0, transparent 39px, rgba(255,255,255,0.04) 39px, rgba(255,255,255,0.04) 40px)',
        }}
      >
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className={`${serif} text-xl tracking-tight`}>FillingLens</span>
        </div>
        <div>
          <div className="h-px w-16 bg-[#B08D4C] mb-8" />
          <h1 className={`${serif} text-5xl leading-[1.1] font-medium tracking-tight max-w-lg`}>
            Read the filing the way an analyst would.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-slate-400 max-w-md">
            Ask in plain language. Every answer shows the passage it came from.
          </p>
          <SampleAnswer />
        </div>
        <p className="text-sm text-slate-500">Built on SEC filings.</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <BrandMark dark />
            <span className={`${serif} text-xl text-[#0F1A2B]`}>FillingLens</span>
          </div>

          <h2 className={`${serif} text-3xl font-medium text-[#0F1A2B] tracking-tight`}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-[15px] text-[#6B7482]">
            {mode === 'signin' ? 'Sign in to continue your research.' : 'Takes ten seconds. No card needed.'}
          </p>

          <form className="mt-8 space-y-3" onSubmit={submit}>
            <input type="email" required autoComplete="email" aria-label="Email address" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
            <div className="relative">
              <input type={show ? 'text' : 'password'} required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} aria-label="Password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={`${inputCls} pr-12`} />
              <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-[#6B7482] hover:text-[#0F1A2B] ${ring}`}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" disabled={loading} className={`w-full mt-2 bg-[#0F1A2B] hover:bg-[#1B2A42] text-white font-medium py-3 rounded-lg text-[15px] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${ring} focus-visible:ring-offset-2`}>
              {loading && <Loader2 size={15} className="motion-safe:animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#6B7482]">
            {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
            <button type="button" onClick={() => { setMode(m => (m === 'signin' ? 'signup' : 'signin')); setMsg(null) }} className={`font-medium text-[#0F1A2B] underline underline-offset-4 decoration-[#B08D4C] rounded ${ring}`}>
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
          {msg && <p role="status" className={`mt-5 text-sm leading-relaxed ${msg.error ? 'text-red-700' : 'text-[#6B7482]'}`}>{msg.text}</p>}
        </div>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* clipboard blocked */
        }
      }}
      className={`inline-flex items-center gap-1.5 text-xs text-[#6B7482] hover:text-[#0F1A2B] px-2 py-1 rounded-md ${ring}`}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const [docs, setDocs] = useState<Doc[]>([])
  const [activeDoc, setActiveDoc] = useState<Doc | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const chats = useRef<Record<number, ChatMessage[]>>({}) // remembers each document's chat

  const authHeaders = (): Record<string, string> =>
    session ? { Authorization: `Bearer ${session.access_token}` } : {}

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setReady(true)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API}/documents`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      const data: Doc[] = await res.json()
      setDocs(data)
      setActiveDoc(prev => prev ?? data[0] ?? null)
      if (data.length === 0) setIsUploadModalOpen(true) // brand new user: pop the upload dialog
    } catch (e) {
      console.error('Failed to fetch docs', e)
    }
  }

  // user id, not the whole session object: Supabase makes a new session object on every tab refocus
  useEffect(() => {
    if (session) fetchDocs()
  }, [session?.user.id])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMessages([])
    setDocs([])
    setActiveDoc(null)
    setIsUploadModalOpen(false)
    chats.current = {}
  }

  const selectDoc = (doc: Doc) => {
    if (doc.id === activeDoc?.id) return
    if (activeDoc) chats.current[activeDoc.id] = messages
    setActiveDoc(doc)
    setMessages(chats.current[doc.id] ?? [])
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    setProgress(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API}/upload`, { method: 'POST', headers: authHeaders(), body: formData })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const { job_id } = await res.json()

      // the backend indexes in the background; poll until it reports done or error
      for (;;) {
        await new Promise(r => setTimeout(r, 1500))
        const pr = await fetch(`${API}/upload/${job_id}`, { headers: authHeaders() })
        if (!pr.ok) throw new Error(`status ${pr.status}`)
        const job = await pr.json()
        if (job.total) setProgress({ done: job.done, total: job.total })
        if (job.status === 'error') throw new Error(job.error)
        if (job.status === 'done') {
          await fetchDocs()
          if (activeDoc) chats.current[activeDoc.id] = messages
          setActiveDoc({ id: job.filing_id, name: job.filename })
          setMessages([])
          setIsUploadModalOpen(false)
          break
        }
      }
    } catch (err) {
      setUploadError(err instanceof Error && err.message && !err.message.startsWith('status') ? err.message : 'Upload failed. Check the backend terminal for the error.')
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  const ask = async (text: string) => {
    const q = text.trim()
    if (!q || loading || !activeDoc) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)

    const fail = (content: string) =>
      setMessages(prev => [...prev, { role: 'assistant', content, error: true, query: q }])

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ query: q, filing_id: activeDoc.id }),
      })
      if (!res.ok) return fail(`The server returned an error (${res.status}). Try again in a moment.`)
      const data = await res.json()
      if (typeof data.answer !== 'string') return fail('The server sent back an unexpected response.')
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, sources: data.sources }])
    } catch {
      fail(`Could not reach the backend at ${API}. Check that the server is running, then retry.`)
    } finally {
      setLoading(false)
    }
  }

  const retry = (i: number, q: string) => {
    setMessages(prev => prev.slice(0, i - 1))
    ask(q)
  }

  if (!ready) return <div className="min-h-dvh bg-[#F5F6F8]" />
  if (!session) return <Login />

  const name = session.user.email?.split('@')[0] ?? ''
  const initial = name.charAt(0).toUpperCase()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className={`flex h-dvh bg-[#F5F6F8] antialiased ${sans}`}>
      <UploadModal
        isOpen={isUploadModalOpen}
        error={uploadError}
        uploading={uploading}
        progress={progress}
        onUpload={handleFileUpload}
        onClose={() => {
          setIsUploadModalOpen(false)
          setUploadError(null)
        }}
      />

      <aside className="hidden md:flex w-72 bg-[#0F1A2B] flex-col shrink-0">
        <div className="px-6 pt-7 pb-6 flex items-center gap-3">
          <BrandMark size={34} />
          <span className={`${serif} text-white text-xl tracking-tight`}>FillingLens</span>
        </div>

        <div className="px-4 space-y-2">
          <button
            onClick={() => setMessages([])}
            className={`w-full flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-white/10 ${ring}`}
          >
            <SquarePen size={16} className="text-[#D9BE8A]" />
            New chat
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            disabled={uploading}
            className={`w-full flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-white/10 disabled:opacity-60 ${ring}`}
          >
            <Upload size={16} className="text-[#D9BE8A]" />
            Upload document
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 mt-8">
          <p className="px-3 text-xs font-medium text-slate-500 mb-2">Documents</p>
          {docs.map(doc => (
            <button
              key={doc.id}
              onClick={() => selectDoc(doc)}
              className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors border-l-2 ${ring} ${
                activeDoc?.id === doc.id
                  ? 'bg-white/[0.06] text-slate-100 border-[#B08D4C]'
                  : 'text-slate-400 hover:bg-white/5 border-transparent'
              }`}
            >
              <FileText size={15} className={activeDoc?.id === doc.id ? 'text-[#D9BE8A] shrink-0' : 'opacity-50 shrink-0'} />
              <span className="truncate">{doc.name}</span>
            </button>
          ))}
          {docs.length === 0 && !uploading && <p className="px-3 text-sm text-slate-500">Upload a file to start.</p>}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-white/10 text-[#D9BE8A] flex items-center justify-center text-sm font-semibold">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 text-slate-400 hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg text-sm transition-colors ${ring}`}
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center justify-between gap-2 px-5 md:px-8 border-b border-[#E3E6EB] bg-[#F5F6F8]/90 backdrop-blur">
          <div className="hidden md:flex items-center gap-2.5 min-w-0">
            <FileText size={15} className="text-[#B08D4C] shrink-0" />
            <span className="text-sm font-medium text-[#0F1A2B] truncate">{activeDoc ? activeDoc.name : 'No document selected'}</span>
          </div>

          <div className="flex md:hidden items-center gap-1 w-full justify-between">
            <select
              aria-label="Document"
              value={activeDoc?.id ?? ''}
              onChange={e => {
                const d = docs.find(x => x.id === Number(e.target.value))
                if (d) selectDoc(d)
              }}
              className="min-w-0 max-w-[11rem] truncate text-sm font-medium bg-transparent text-[#0F1A2B] rounded-lg py-1"
            >
              {docs.length === 0 && <option value="">No document</option>}
              {docs.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="flex items-center">
              <button onClick={() => setIsUploadModalOpen(true)} aria-label="Upload document" className={`p-2 rounded-lg text-[#0F1A2B] hover:bg-white ${ring}`}>
                <Upload size={17} />
              </button>
              <button onClick={() => setMessages([])} aria-label="New chat" className={`p-2 rounded-lg text-[#0F1A2B] hover:bg-white ${ring}`}>
                <SquarePen size={17} />
              </button>
              <button onClick={handleLogout} aria-label="Log out" className={`p-2 rounded-lg text-[#0F1A2B] hover:bg-white ${ring}`}>
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 md:px-8">
          <div className="max-w-3xl mx-auto py-10">
            {!activeDoc ? (
              <div className="text-center mt-32 text-[#6B7482] flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-[#E3E6EB] flex items-center justify-center mb-6">
                  <Upload size={28} className="text-[#B08D4C]" />
                </div>
                <p className="text-lg font-medium text-[#0F1A2B] mb-2">No documents yet</p>
                <p className="mb-6">Upload a financial filing to start researching.</p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className={`bg-[#0F1A2B] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1B2A42] transition-colors ${ring} focus-visible:ring-offset-2`}
                >
                  Upload document
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="pt-10 md:pt-20">
                <div className="h-px w-14 bg-[#B08D4C] mb-8" />
                <p className="text-[15px] text-[#6B7482] mb-3">
                  {greeting}, {name}.
                </p>
                <h2 className={`${serif} text-4xl md:text-5xl font-medium text-[#0F1A2B] tracking-tight leading-[1.1]`}>
                  What would you like to know about {activeDoc.name}?
                </h2>
                <p className="mt-5 text-[17px] text-[#6B7482] max-w-xl leading-relaxed">
                  Answers come from the document and cite the passages they rely on, so you can check every figure.
                </p>
                <div className="mt-10 grid gap-3">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className={`text-left bg-white border border-[#E3E6EB] hover:border-[#B08D4C] rounded-xl px-5 py-4 text-[15px] text-[#0F1A2B] transition-colors ${ring}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {messages.map((msg, i) =>
                  msg.role === 'user' ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[85%] bg-[#0F1A2B] text-white rounded-2xl rounded-br-md px-5 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 w-7 h-7 shrink-0 rounded-md bg-[#0F1A2B] text-[#D9BE8A] flex items-center justify-center">
                        <span className={`${serif} italic font-semibold text-sm`}>F</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        {msg.error ? (
                          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                            <p className="text-[15px] text-red-800 leading-relaxed">{msg.content}</p>
                            {msg.query && (
                              <button
                                onClick={() => retry(i, msg.query!)}
                                className={`mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-red-800 hover:underline rounded ${ring}`}
                              >
                                <RotateCcw size={13} /> Retry
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            <div
                              className={`prose prose-slate max-w-none prose-p:leading-[1.75] prose-p:text-[17px] prose-p:text-[#1B2536] prose-li:text-[17px] prose-li:text-[#1B2536] prose-strong:text-[#0F1A2B] prose-headings:font-medium prose-headings:text-[#0F1A2B] prose-a:text-[#8A6A2F] prose-table:text-sm ${serif}`}
                            >
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            <div className="mt-5 pt-3 border-t border-[#E3E6EB] flex items-center gap-2 flex-wrap">
                              {msg.sources && msg.sources.length > 0 && (
                                <>
                                  <span className="text-xs font-medium text-[#6B7482]">Sources</span>
                                  {msg.sources.map(id => (
                                    <span
                                      key={id}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-[#0F1A2B] border border-[#E3E6EB] ${sans}`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#B08D4C]" />
                                      Chunk {id}
                                    </span>
                                  ))}
                                </>
                              )}
                              <span className="ml-auto">
                                <CopyButton text={msg.content} />
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                )}

                {loading && (
                  <div className="flex gap-4" role="status" aria-label="Reading the filing">
                    <div className="mt-1 w-7 h-7 shrink-0 rounded-md bg-[#0F1A2B] text-[#D9BE8A] flex items-center justify-center">
                      <Loader2 size={14} className="motion-safe:animate-spin" />
                    </div>
                    <div className="flex-1 space-y-2.5 pt-2">
                      <div className="h-3 w-3/4 rounded bg-[#E3E6EB] motion-safe:animate-pulse" />
                      <div className="h-3 w-full rounded bg-[#E3E6EB] motion-safe:animate-pulse" />
                      <div className="h-3 w-1/2 rounded bg-[#E3E6EB] motion-safe:animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="shrink-0 px-5 md:px-8 pb-5 pt-2 bg-gradient-to-t from-[#F5F6F8] via-[#F5F6F8] to-transparent">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={e => {
                e.preventDefault()
                ask(input)
              }}
              className="flex items-end gap-2 bg-white border border-[#E3E6EB] rounded-2xl pl-5 pr-2 py-2 shadow-[0_8px_30px_-12px_rgba(15,26,43,0.25)] transition-shadow focus-within:border-[#B08D4C] focus-within:ring-2 focus-within:ring-[#B08D4C]/30"
            >
              <textarea
                ref={taRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    ask(input)
                  }
                }}
                disabled={!activeDoc}
                placeholder={activeDoc ? 'Ask about revenue, margins, risks, segments…' : 'Upload a document first'}
                aria-label="Your question"
                className="flex-1 min-w-0 resize-none py-2.5 text-[16px] leading-6 text-[#0F1A2B] placeholder:text-[#9AA2AF] bg-transparent focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !activeDoc}
                aria-label="Send question"
                className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-[#0F1A2B] text-[#D9BE8A] hover:bg-[#1B2A42] transition-colors disabled:bg-[#E3E6EB] disabled:text-[#9AA2AF] ${ring} focus-visible:ring-offset-2`}
              >
                <ArrowUp size={18} />
              </button>
            </form>
            <p className="text-center text-xs text-[#9AA2AF] mt-3">
              Enter to send, Shift+Enter for a new line. Check the cited passages before relying on a figure.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
