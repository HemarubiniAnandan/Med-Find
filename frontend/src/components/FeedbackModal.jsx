import React, { useState } from 'react'
import { X, Star, MessageSquare, CheckCircle2 } from 'lucide-react'

export default function FeedbackModal({ isOpen, onClose, user }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/patient/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.access_token ? { 'Authorization': `Bearer ${user.access_token}` } : {})
        },
        body: JSON.stringify({ rating, comment })
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          setComment('')
          onClose()
        }, 1800)
      }
    } catch (err) {
      console.error("Feedback error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare className="text-emerald-600" size={20} /> App & Pharmacy Feedback
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle2 size={48} className="text-emerald-600" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontWeight: '700', color: '#0f172a' }}>Thank You for Your Feedback!</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
              Your feedback helps improve real-time stock accuracy across Indian pharmacies.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Rate Your Search Experience</label>
              <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={28}
                    className={star <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}
                    style={{ cursor: 'pointer', fill: star <= rating ? '#f59e0b' : 'transparent', color: star <= rating ? '#f59e0b' : '#cbd5e1' }}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Your Review / Comments</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Share your experience finding medicine stock or contacting pharmacy on WhatsApp..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              ></textarea>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
