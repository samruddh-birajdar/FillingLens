import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle} from 'lucide-react'

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/invoices/${id}`)
      .then(res => res.json())
      .then(data => {
        setInvoice(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [id])

  const handleAction = async (action: 'approve' | 'reject') => {
    await fetch(`${API}/invoices/${id}/${action}`, { method: 'POST' })
    navigate('/invoice') // Go back to the list
  }

  if (loading) return <div>Loading...</div>
  if (!invoice) return <div>Invoice not found</div>

  return (
    <div className="flex h-full">
      {/* Left Side: PDF Viewer */}
      <div className="w-1/2 bg-gray-100 border-r border-[#E3E6EB]">
        {invoice.file_path ? (
          <iframe 
            src={`${API}/${invoice.file_path}`} 
            className="w-full h-full" 
            title="Invoice PDF"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No PDF attached
          </div>
        )}
      </div>

      {/* Right Side: Data & Actions */}
      <div className="w-1/2 bg-white p-8 overflow-y-auto">
        <button onClick={() => navigate('/invoice')} className="flex items-center gap-2 text-sm text-gray-500 mb-6 hover:text-black">
          <ArrowLeft size={16} /> Back to Queue
        </button>

        <h1 className="text-3xl font-semibold mb-2">{invoice.vendor_name}</h1>
        <p className="text-gray-500 mb-8">Invoice #{invoice.id}</p>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">GST Number</span>
            <span className="font-medium">{invoice.gst_number}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">₹{invoice.subtotal}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">GST Amount</span>
            <span className="font-medium">₹{invoice.gst_amount}</span>
          </div>
          <div className="flex justify-between border-b pb-2 text-lg">
            <span className="font-semibold">Total</span>
            <span className="font-bold">₹{invoice.total}</span>
          </div>
        </div>

        {/* Rule Results */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h3 className="font-semibold text-yellow-800 mb-2">Rules Check</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700">
            {invoice.reasons.map((reason: string, i: number) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={() => handleAction('approve')}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} /> Approve
          </button>
          <button 
            onClick={() => handleAction('reject')}
            className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2"
          >
            <XCircle size={18} /> Reject
          </button>
        </div>
      </div>
    </div>
  )
}