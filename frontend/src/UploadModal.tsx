import { useEffect, useRef, useState } from 'react'
import { Upload, Loader2, X, FileText } from 'lucide-react'

const serif = "font-['Newsreader',Georgia,serif]"
const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D4C]'
const ALLOWED = ['.pdf', '.htm', '.html', '.txt']
const MAX_MB = 25

type Props = {
  isOpen: boolean
  uploading: boolean
  progress?: { done: number; total: number } | null
  error: string | null
  onUpload: (file: File) => void
  onClose: () => void
}

export default function UploadModal({ isOpen, uploading, progress, error, onUpload, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [fileName, setFileName] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLocalErr(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !uploading && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, uploading, onClose])

  if (!isOpen) return null

  const pick = (file?: File | null) => {
    if (!file || uploading) return
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
    if (!ALLOWED.includes(ext)) return setLocalErr(`That file type isn't supported. Use ${ALLOWED.join(', ')}.`)
    if (file.size > MAX_MB * 1024 * 1024) return setLocalErr(`That file is over ${MAX_MB} MB.`)
    setLocalErr(null)
    setFileName(file.name)
    onUpload(file)
  }

  const shownError = localErr ?? error

  return (
    <div
      className="fl-fade fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1A2B]/55 backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && !uploading && onClose()}
    >
      <style>{`
        @keyframes fl-fade{from{opacity:0}to{opacity:1}}
        @keyframes fl-rise{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
        .fl-fade{animation:fl-fade .18s ease-out}
        .fl-rise{animation:fl-rise .22s ease-out}
        @media (prefers-reduced-motion:reduce){.fl-fade,.fl-rise{animation:none}}
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
        className="fl-rise w-full max-w-lg rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(15,26,43,0.55)] overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 px-8 pt-8">
          <div>
            <div className="h-px w-12 bg-[#B08D4C] mb-5" />
            <h3 id="upload-title" className={`${serif} text-3xl font-medium text-[#0F1A2B] tracking-tight leading-tight`}>
              Add a document
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6B7482]">
              Upload a filing and ask questions about it. Every answer points back to the passage it used.
            </p>
          </div>
          {!uploading && (
            <button
              onClick={onClose}
              aria-label="Close"
              className={`-mr-2 -mt-1 p-2 rounded-lg text-[#6B7482] hover:text-[#0F1A2B] hover:bg-[#F5F6F8] transition-colors ${ring}`}
            >
              <X size={19} />
            </button>
          )}
        </div>

        <div className="p-8">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED.join(',')}
            className="hidden"
            onChange={e => {
              pick(e.target.files?.[0])
              e.target.value = '' // lets you re-pick the same file after a failure
            }}
          />

          <div
            onDragOver={e => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => {
              e.preventDefault()
              setDrag(false)
              pick(e.dataTransfer.files?.[0])
            }}
            className={`flex flex-col items-center justify-center text-center h-60 rounded-xl border-2 border-dashed px-6 transition-colors ${
              drag ? 'border-[#B08D4C] bg-[#B08D4C]/5' : 'border-[#E3E6EB] bg-[#F5F6F8]/60'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={34} className="text-[#B08D4C] motion-safe:animate-spin mb-4" />
                <p className="text-[15px] font-medium text-[#0F1A2B]">Reading and indexing</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6B7482] max-w-full">
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate">{fileName}</span>
                </p>
                {progress ? (
                  <div className="mt-4 w-full max-w-xs">
                    <div className="h-1.5 rounded-full bg-[#E3E6EB] overflow-hidden">
                      <div className="h-full bg-[#B08D4C] transition-all duration-500" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-[#6B7482]">Embedded {progress.done} of {progress.total} sections</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#9AA2AF]">Extracting text…</p>
                )}
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-white border border-[#E3E6EB] flex items-center justify-center mb-4">
                  <Upload size={22} className="text-[#B08D4C]" />
                </div>
                <button
                  autoFocus
                  onClick={() => inputRef.current?.click()}
                  className={`bg-[#0F1A2B] hover:bg-[#1B2A42] text-white font-medium px-6 py-2.5 rounded-lg text-[15px] transition-colors ${ring} focus-visible:ring-offset-2`}
                >
                  Upload document
                </button>
                <p className="mt-3 text-sm text-[#6B7482]">or drop a file here</p>
                <p className="mt-1 text-xs text-[#9AA2AF]">PDF, HTML or TXT, up to {MAX_MB} MB</p>
              </>
            )}
          </div>

          {shownError && (
            <p role="alert" className="mt-4 text-sm leading-relaxed text-red-700">
              {shownError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
