import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import PatientView from './components/PatientView'
import PharmacyView from './components/PharmacyView'

export default function App() {
  const [activeRole, setActiveRole] = useState('patient')
  const [user, setUser] = useState(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem('medfind_user')
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        setUser(parsed)
      } catch (e) {
        localStorage.removeItem('medfind_user')
      }
    }
  }, [])

  const handleAuthSuccess = (userData) => {
    setUser(userData)
    localStorage.setItem('medfind_user', JSON.stringify(userData))
    if (userData.role) {
      setActiveRole(userData.role)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('medfind_user')
    setActiveRole('patient')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main style={{ flex: 1 }}>
        {activeRole === 'patient' ? (
          <PatientView
            user={user}
            onRequireAuth={() => setIsAuthOpen(true)}
          />
        ) : (
          <PharmacyView
            user={user}
            onRequireAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', marginTop: 'auto', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong style={{ color: '#059669', fontSize: '1.1rem' }}>MedFind India</strong> — Real-time medicine stock locator platform.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
            <span>Single Source Database</span>
            <span>Google Distance Matrix</span>
            <span>Twilio WhatsApp API</span>
            <span>FastAPI + React</span>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  )
}
