import React from 'react'
import { Pill, User, Store, LogOut, LogIn } from 'lucide-react'

export default function Navbar({ activeRole, setActiveRole, user, onOpenAuth, onLogout }) {
  return (
    <nav className="navbar">
      <div className="brand-logo">
        <Pill className="text-emerald-600" size={28} />
        <span>MedFind</span>
        <span className="brand-badge">India Live Stock</span>
      </div>

      <div className="role-switcher">
        <button
          className={`role-btn ${activeRole === 'patient' ? 'active' : ''}`}
          onClick={() => setActiveRole('patient')}
        >
          <User size={16} /> Patient View
        </button>
        <button
          className={`role-btn ${activeRole === 'pharmacy' ? 'active' : ''}`}
          onClick={() => setActiveRole('pharmacy')}
        >
          <Store size={16} /> Pharmacy View
        </button>
      </div>

      <div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="user-pill">
              <User size={16} className="text-emerald-600" />
              <span>{user.full_name} ({user.role})</span>
            </div>
            <button className="btn-outline" onClick={onLogout} style={{ padding: '0.4rem 0.75rem' }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={onOpenAuth}>
            <LogIn size={16} /> Login / Sign Up
          </button>
        )}
      </div>
    </nav>
  )
}
