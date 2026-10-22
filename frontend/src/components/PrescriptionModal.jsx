import React, { useState } from 'react'
import { X, Upload, CheckCircle2, FileText, Sparkles } from 'lucide-react'

export default function PrescriptionModal({ isOpen, onClose, pharmacy, user }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !pharmacy) return null

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setFile(selected)
      setPreview(URL.createObjectURL(selected))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('pharmacy_id', pharmacy.pharmacy_id)
    formData.append('file', file)

    try {
      const res = await fetch('/api/patient/prescriptions/upload', {
        method: 'POST',
        headers: {
          ...(user?.access_token ? { 'Authorization': `Bearer ${user.access_token}` } : {})
        },
        body: formData
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Upload failed')
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setFile(null)
        setPreview(null)
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText className="text-emerald-600" size={20} /> Upload Prescription
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
          Uploading to: <strong>{pharmacy.pharmacy_name}</strong>
        </div>

        {/* Future OCR / AI Extension Point Banner */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.78rem', color: '#166534' }}>
          <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
            <Sparkles size={14} /> AI OCR Parsing Ready
          </div>
          Photos uploaded will be parsed by pharmacists and prepared for future AI auto-dosage verification.
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle2 size={48} className="text-emerald-600" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontWeight: '700', color: '#0f172a' }}>Prescription Uploaded!</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
              The pharmacist team at {pharmacy.pharmacy_name} has received your prescription for verification.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Select Prescription Image (JPG/PNG)</label>
              <input
                type="file"
                accept="image/*"
                className="form-control"
                onChange={handleFileChange}
                required
              />
            </div>

            {preview && (
              <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                <img
                  src={preview}
                  alt="Prescription Preview"
                  style={{ maxHeight: '200px', borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'contain' }}
                />
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Send Prescription to Pharmacy'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
