import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

type Invoice = {
  id: number
  vendor: string
  total: number
  status: 'READY' | 'NEEDS_REVIEW' | 'REJECTED'
  reasons: string[]
}

export default function InvoiceReview() {
  const [loading, setLoading] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API}/invoices/list`)
      const data = await res.json()
      setInvoices(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const handleLoadSample = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/invoices/load-sample`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to load sample')
      await fetchInvoices()
      setMessage('Sample invoice loaded successfully!')
    } catch (err) {
      setMessage('Failed to load sample.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API}/invoices/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      
      await fetchInvoices()
      setMessage(`Invoice processed: ${data.status}`)
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 32, fontWeight: 600, color: '#0F1A2B', marginBottom: 10 }}>Invoice Review</h1>
      <p style={{ color: '#6B7482', marginBottom: 30 }}>Review supplier invoices before they hit your books.</p>

      <div style={{ 
        border: '2px dashed #E3E6EB', borderRadius: 12, padding: 50, 
        textAlign: 'center', background: '#F5F6F8', marginBottom: 30 
      }}>
        <Upload size={40} style={{ color: '#B08D4C', marginBottom: 16 }} />
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Drag & drop an invoice here</h3>
        <p style={{ color: '#6B7482', marginBottom: 16 }}>or click to browse files</p>
        
        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleFileUpload} 
          style={{ display: 'none' }} 
          id="file-upload" 
        />
        <label htmlFor="file-upload" style={{ 
          background: '#0F1A2B', color: 'white', padding: '10px 20px', 
          borderRadius: 8, cursor: 'pointer', display: 'inline-block' 
        }}>
          {loading ? 'Processing...' : 'Upload Invoice'}
        </label>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <button 
          onClick={handleLoadSample} 
          disabled={loading}
          style={{ background: 'transparent', border: 'none', color: '#B08D4C', textDecoration: 'underline', cursor: 'pointer', fontSize: 14 }}
        >
          Want to see how it works? Load Sample Invoice
        </button>
      </div>

      {message && <p style={{ textAlign: 'center', color: '#16a34a', marginBottom: 20 }}>{message}</p>}

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0F1A2B', marginBottom: 16 }}>Your Queue ({invoices.length})</h2>
      
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E3E6EB', overflow: 'hidden' }}>
        {invoices.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#6B7482' }}>No invoices yet.</div>
        ) : (
          invoices.map((inv) => (
            <button 
              key={inv.id} 
              onClick={() => navigate(`/invoice/${inv.id}`)}
              style={{ 
                width: '100%', textAlign: 'left', padding: 20, borderBottom: '1px solid #E3E6EB', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                cursor: 'pointer', background: 'transparent' 
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: '#0F1A2B' }}>{inv.vendor}</div>
                <div style={{ fontSize: 14, color: '#6B7482' }}>₹{inv.total}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {inv.status === 'READY' && <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={16}/> Ready</span>}
                {inv.status === 'NEEDS_REVIEW' && <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 5 }}><AlertTriangle size={16}/> Needs Review</span>}
                {inv.status === 'REJECTED' && <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}><FileText size={16}/> Rejected</span>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}