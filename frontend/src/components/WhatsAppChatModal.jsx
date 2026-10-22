import React, { useState, useEffect } from 'react'
import { X, Send, MessageSquare, PhoneCall } from 'lucide-react'

export default function WhatsAppChatModal({ isOpen, onClose, pharmacy, user }) {
  const [messages, setMessages] = useState([])
  const [inputMsg, setInputMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && pharmacy) {
      fetchThread()
    }
  }, [isOpen, pharmacy])

  const fetchThread = async () => {
    try {
      const res = await fetch(`/api/chat/thread?pharmacy_id=${pharmacy.pharmacy_id}`, {
        headers: user?.access_token ? { 'Authorization': `Bearer ${user.access_token}` } : {}
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (err) {
      console.error("Error fetching chat thread:", err)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputMsg.trim()) return

    const text = inputMsg
    setInputMsg('')

    // Optimistic UI update
    const optimisticMsg = {
      id: Date.now(),
      patient_id: user?.user_id || 1,
      pharmacy_id: pharmacy.pharmacy_id,
      message: text,
      direction: 'outbound',
      timestamp: new Date().toISOString()
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.access_token ? { 'Authorization': `Bearer ${user.access_token}` } : {})
        },
        body: JSON.stringify({
          pharmacy_id: pharmacy.pharmacy_id,
          message: text
        })
      })

      if (res.ok) {
        fetchThread()
      }
    } catch (err) {
      console.error("Error sending WhatsApp message:", err)
    }
  }

  if (!isOpen || !pharmacy) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="modal-header" style={{ background: '#075e54', color: 'white', padding: '1rem 1.25rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MessageSquare size={24} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>{pharmacy.pharmacy_name}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <PhoneCall size={12} /> WhatsApp: {pharmacy.pharmacy_whatsapp}
              </div>
            </div>
          </div>
          <button className="close-btn" style={{ color: 'white' }} onClick={onClose}><X size={20} /></button>
        </div>

        <div className="chat-window">
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem', fontSize: '0.85rem' }}>
                Start WhatsApp inquiry for <strong>{pharmacy.medicine_name}</strong> availability.
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className={`chat-bubble ${m.direction}`}>
                  <div>{m.message}</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.7, textAlign: 'right', marginTop: '0.2rem' }}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>

          <form className="chat-input-bar" onSubmit={handleSend}>
            <input
              type="text"
              className="form-control"
              placeholder="Ask pharmacist on WhatsApp..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1rem' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
