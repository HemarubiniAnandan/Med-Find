import React, { useState } from 'react'
import { X, LogIn, UserPlus, Sparkles } from 'lucide-react'

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [role, setRole] = useState('patient')
  const [email, setEmail] = useState('patient@medfind.in')
  const [password, setPassword] = useState('patient123')
  const [fullName, setFullName] = useState('Rajesh Kumar')
  const [phone, setPhone] = useState('+919876543210')
  const [pharmacyName, setPharmacyName] = useState('Apollo Pharmacy - Indiranagar')
  const [address, setAddress] = useState('100 Feet Road, Indiranagar, Bengaluru')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleFillDemo = (demoRole) => {
    setRole(demoRole)
    if (demoRole === 'patient') {
      setEmail('patient@medfind.in')
      setPassword('patient123')
      setFullName('Rajesh Kumar')
      setPhone('+919876543210')
    } else {
      setEmail('apollo@medfind.in')
      setPassword('pharmacy123')
      setFullName('Apollo Pharmacy Manager')
      setPhone('+919812345678')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const url = isLogin ? '/api/auth/login' : '/api/auth/register'
    const payload = isLogin
      ? { email, password }
      : {
          email,
          password,
          role,
          full_name: fullName,
          phone,
          pharmacy_name: role === 'pharmacy' ? pharmacyName : null,
          address: role === 'pharmacy' ? address : null,
          whatsapp_number: phone
        }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed')
      }

      onAuthSuccess(data)
      onClose()
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
          <h3 className="modal-title">
            {isLogin ? 'Welcome Back to MedFind' : 'Create MedFind Account'}
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Quick Demo Credentials Fill Buttons */}
        <div style={{ background: '#ecfdf5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#065f46', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={14} /> Quick Demo One-Click Fill:
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: '#ffffff' }}
              onClick={() => handleFillDemo('patient')}
            >
              Fill Patient Demo
            </button>
            <button
              type="button"
              className="btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: '#ffffff' }}
              onClick={() => handleFillDemo('pharmacy')}
            >
              Fill Pharmacy Demo
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">I am registering as a:</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="radio" name="role" value="patient" checked={role === 'patient'} onChange={() => setRole('patient')} /> Patient
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="radio" name="role" value="pharmacy" checked={role === 'pharmacy'} onChange={() => setRole('pharmacy')} /> Pharmacy Owner
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="text" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>

              {role === 'pharmacy' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Pharmacy Name</label>
                    <input type="text" className="form-control" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address & City</label>
                    <input type="text" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} required />
                  </div>
                </>
              )}
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <span
            style={{ color: '#059669', fontWeight: '700', cursor: 'pointer' }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Register now' : 'Log in here'}
          </span>
        </div>
      </div>
    </div>
  )
}
