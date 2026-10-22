import React, { useState, useEffect } from 'react'
import {
  Search, MapPin, Navigation, Clock, Phone, MessageSquare, Upload,
  Pill, Thermometer, Activity, Heart, ShieldAlert, Baby, Sparkles, AlertTriangle, MessageCircle, Star
} from 'lucide-react'
import MapView from './MapView'
import WhatsAppChatModal from './WhatsAppChatModal'
import PrescriptionModal from './PrescriptionModal'
import FAQSection from './FAQSection'
import FeedbackModal from './FeedbackModal'

const INDIAN_AREAS = [
  { name: "Indiranagar, Bengaluru", lat: 12.9784, lng: 77.6408 },
  { name: "Koramangala, Bengaluru", lat: 12.9345, lng: 77.6242 },
  { name: "Whitefield, Bengaluru", lat: 12.9698, lng: 77.7499 },
  { name: "Jayanagar, Bengaluru", lat: 12.9250, lng: 77.5938 },
  { name: "MG Road, Bengaluru", lat: 12.9716, lng: 77.5946 }
]

export default function PatientView({ user, onRequireAuth }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [patientLoc, setPatientLoc] = useState({
    lat: 12.9716,
    lng: 77.5946,
    areaName: 'MG Road, Bengaluru (Auto-Detected)'
  })

  const [categories, setCategories] = useState([])
  const [searchResults, setSearchResults] = useState(null)
  const [loadingSearch, setLoadingSearch] = useState(false)

  // Modals state
  const [chatPharmacy, setChatPharmacy] = useState(null)
  const [prescPharmacy, setPrescPharmacy] = useState(null)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  useEffect(() => {
    // 1. Auto-detect browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPatientLoc({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            areaName: 'Current Browser Geolocation'
          })
        },
        (err) => {
          console.log("Geolocation fallback to default area:", err.message)
        }
      )
    }

    // 2. Fetch categories
    fetch('/api/patient/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error loading categories:", err))

    // 3. Perform initial search for popular medicine Dolo 650
    handleSearch('Dolo 650')
  }, [])

  const handleSearch = async (queryText = searchQuery) => {
    if (!queryText || !queryText.trim()) return
    setLoadingSearch(true)
    setSearchQuery(queryText)

    try {
      const url = `/api/patient/search?q=${encodeURIComponent(queryText)}&lat=${patientLoc.lat}&lng=${patientLoc.lng}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
      }
    } catch (err) {
      console.error("Search error:", err)
    } finally {
      setLoadingSearch(false)
    }
  }

  const handleAreaChange = (e) => {
    const selectedName = e.target.value
    const found = INDIAN_AREAS.find(a => a.name === selectedName)
    if (found) {
      setPatientLoc({
        lat: found.lat,
        lng: found.lng,
        areaName: found.name
      })
      // Re-run search with new location
      if (searchQuery) {
        handleSearch(searchQuery)
      }
    }
  }

  const renderCategoryIcon = (iconName) => {
    switch (iconName) {
      case 'Thermometer': return <Thermometer size={22} />
      case 'Activity': return <Activity size={22} />
      case 'Heart': return <Heart size={22} />
      case 'ShieldAlert': return <ShieldAlert size={22} />
      case 'Baby': return <Baby size={22} />
      case 'Sparkles': return <Sparkles size={22} />
      default: return <Pill size={22} />
    }
  }

  return (
    <div>
      {/* Hero Section & Live Location Bar */}
      <section className="hero-section">
        <div className="location-bar">
          <MapPin className="text-emerald-400" size={16} />
          <span>Live Location:</span>
          <select
            value={patientLoc.areaName}
            onChange={handleAreaChange}
            style={{ background: 'transparent', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}
          >
            <option style={{ color: '#0f172a' }} value={patientLoc.areaName}>{patientLoc.areaName}</option>
            {INDIAN_AREAS.map((a, i) => (
              <option key={i} style={{ color: '#0f172a' }} value={a.name}>{a.name}</option>
            ))}
          </select>
        </div>

        <h1 style={{ fontFamily: 'Outfit', fontSize: '2.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Real-Time Medicine Stock Locator
        </h1>
        <p style={{ opacity: 0.85, fontSize: '0.95rem', marginBottom: '1.75rem' }}>
          Direct live database queries to nearby Indian pharmacies — zero static data.
        </p>

        {/* Search Bar */}
        <div className="search-box-wrapper">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }} className="search-input-container">
            <Search className="text-slate-400" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="Search medicine brand or salt name (e.g. Dolo 650, Crocin, Paracetamol, Metformin)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-btn">
              {loadingSearch ? 'Searching...' : 'Find Stock'}
            </button>
          </form>
        </div>
      </section>

      {/* Category Tiles */}
      <section className="categories-container">
        <div className="section-title">
          <Pill className="text-emerald-600" size={22} /> Browse by Medical Category
        </div>
        <div className="category-grid">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              className="category-card"
              onClick={() => {
                handleSearch(cat.name)
                const el = document.getElementById('results-section')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <div className="category-icon">{renderCategoryIcon(cat.icon)}</div>
              <div className="category-name">{cat.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Search Results Grid & Map Sidebar */}
      <section id="results-section" className="results-container">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
              {searchResults ? `Stock Results for "${searchResults.query}" (${searchResults.total_found} found)` : 'Stock Results'}
            </h3>
            <button className="btn-outline" onClick={() => setIsFeedbackOpen(true)} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              <Star size={14} className="text-amber-500" /> Give Search Feedback
            </button>
          </div>

          {/* Exact Matches */}
          {searchResults && searchResults.exact_matches.length > 0 && (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#059669', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Exact Medicine Matches ({searchResults.exact_matches.length})
              </div>
              {searchResults.exact_matches.map((item, idx) => (
                <div key={idx} className="result-card">
                  <div className="card-header">
                    <div>
                      <div className="pharmacy-name">{item.pharmacy_name}</div>
                      <div className="pharmacy-address">
                        <MapPin size={14} /> {item.pharmacy_address}
                      </div>
                    </div>
                    <span className={`badge ${item.stock_status === 'In Stock' ? 'badge-in-stock' : item.stock_status === 'Low Stock' ? 'badge-low-stock' : 'badge-out-stock'}`}>
                      {item.stock_status}
                    </span>
                  </div>

                  <div className="card-body-info">
                    <div className="info-stat">
                      <span className="label">Medicine Name</span>
                      <span className="value" style={{ color: '#059669' }}>{item.medicine_name}</span>
                    </div>
                    <div className="info-stat">
                      <span className="label">Salt / Generic</span>
                      <span className="value" style={{ fontSize: '0.88rem' }}>{item.generic_name}</span>
                    </div>
                    <div className="info-stat">
                      <span className="label">Price</span>
                      <span className="value">₹{item.price}</span>
                    </div>
                    <div className="info-stat">
                      <span className="label">Available Stock</span>
                      <span className="value">{item.quantity} units</span>
                    </div>
                    <div className="info-stat">
                      <span className="label">Live Distance</span>
                      <span className="value" style={{ color: '#0369a1' }}>
                        {item.distance_km} km ({item.estimated_time_mins} mins)
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> Stock Last Updated: {new Date(item.last_updated).toLocaleTimeString()} (Batch: {item.batch_id})
                    </div>
                    <div className="card-actions">
                      <button className="btn-whatsapp" onClick={() => setChatPharmacy(item)}>
                        <MessageCircle size={16} /> Contact via WhatsApp
                      </button>
                      <button className="btn-outline" onClick={() => setPrescPharmacy(item)}>
                        <Upload size={14} /> Upload Prescription
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Same-Salt / Generic Alternatives */}
          {searchResults && searchResults.generic_alternatives.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0369a1', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={16} /> Same-Salt / Generic Alternatives in Stock ({searchResults.generic_alternatives.length})
              </div>
              {searchResults.generic_alternatives.map((item, idx) => (
                <div key={idx} className="result-card" style={{ borderColor: '#bae6fd', background: '#f0f9ff' }}>
                  <div className="card-header">
                    <div>
                      <div className="pharmacy-name">{item.pharmacy_name}</div>
                      <div className="pharmacy-address">
                        <MapPin size={14} /> {item.pharmacy_address}
                      </div>
                    </div>
                    <span className="badge badge-generic">Generic Substitute</span>
                  </div>

                  <div className="card-body-info">
                    <div className="info-stat">
                      <span className="label">Alternative Brand</span>
                      <span className="value" style={{ color: '#0369a1' }}>{item.medicine_name}</span>
                    </div>
                    <div className="info-stat">
                      <span className="label">Shared Salt</span>
                      <span className="value">{item.generic_name}</span>
                    </div>
                    <div className="info-stat">
                      <span className="label">Price</span>
                      <span className="value">₹{item.price}</span>
                    </div>
                    <div className="info-stat">
                      <span className="label">Distance</span>
                      <span className="value">{item.distance_km} km</span>
                    </div>
                  </div>

                  <div className="card-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn-whatsapp" onClick={() => setChatPharmacy(item)}>
                      <MessageCircle size={16} /> Contact via WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchResults && searchResults.total_found === 0 && (
            <div style={{ background: 'white', padding: '3rem 1.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <AlertTriangle size={40} className="text-amber-500" style={{ margin: '0 auto 0.75rem' }} />
              <h4 style={{ fontWeight: '700', color: '#0f172a' }}>No stock found for "{searchResults.query}"</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                Try searching for generic salt names (e.g. Paracetamol) or check nearby locations.
              </p>
            </div>
          )}
        </div>

        {/* Embedded Map Sidebar */}
        <div className="map-sidebar">
          <MapView
            patientLocation={patientLoc}
            searchResults={searchResults ? [...searchResults.exact_matches, ...searchResults.generic_alternatives] : []}
          />
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <FAQSection />

      {/* WhatsApp & Prescription Modals */}
      <WhatsAppChatModal
        isOpen={!!chatPharmacy}
        onClose={() => setChatPharmacy(null)}
        pharmacy={chatPharmacy}
        user={user}
      />

      <PrescriptionModal
        isOpen={!!prescPharmacy}
        onClose={() => setPrescPharmacy(null)}
        pharmacy={prescPharmacy}
        user={user}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        user={user}
      />
    </div>
  )
}
