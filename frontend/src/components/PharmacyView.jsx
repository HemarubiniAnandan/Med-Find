import React, { useState, useEffect } from 'react'
import {
  Store, Package, Plus, Upload, RefreshCw, FileText, MessageSquare, Star, CheckCircle, XCircle, AlertCircle, Scan
} from 'lucide-react'

export default function PharmacyView({ user, onRequireAuth }) {
  const [stockList, setStockList] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [feedbackList, setFeedbackList] = useState([])
  const [loading, setLoading] = useState(false)

  // Add stock modal state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isCsvOpen, setIsCsvOpen] = useState(false)
  const [medName, setMedName] = useState('')
  const [genName, setGenName] = useState('')
  const [category, setCategory] = useState('Fever & Pain')
  const [batchId, setBatchId] = useState('B-NEW-101')
  const [quantity, setQuantity] = useState(50)
  const [price, setPrice] = useState(40.0)
  const [expiryDate, setExpiryDate] = useState('2027-12-31')

  // CSV file state
  const [csvFile, setCsvFile] = useState(null)

  // POS Scanner extension modal
  const [isPosOpen, setIsPosOpen] = useState(false)
  const [posBarcode, setPosBarcode] = useState('')
  const [posQty, setPosQty] = useState(1)
  const [posMsg, setPosMsg] = useState('')

  useEffect(() => {
    if (!user || user.role !== 'pharmacy') {
      onRequireAuth()
      return
    }
    fetchPharmacyData()
  }, [user])

  const fetchPharmacyData = async () => {
    if (!user?.access_token) return
    setLoading(true)

    const headers = { 'Authorization': `Bearer ${user.access_token}` }

    try {
      const [resStock, resPresc, resFb] = await Promise.all([
        fetch('/api/pharmacy/stock', { headers }),
        fetch('/api/pharmacy/prescriptions', { headers }),
        fetch('/api/pharmacy/feedback', { headers })
      ])

      if (resStock.ok) setStockList(await resStock.json())
      if (resPresc.ok) setPrescriptions(await resPresc.json())
      if (resFb.ok) setFeedbackList(await resFb.json())
    } catch (err) {
      console.error("Error fetching pharmacy data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleInlineQuantityChange = async (stockId, newQty) => {
    const qtyVal = parseInt(newQty)
    if (isNaN(qtyVal)) return

    // Optimistic UI update
    setStockList(prev => prev.map(s => s.id === stockId ? { ...s, quantity: qtyVal } : s))

    try {
      await fetch(`/api/pharmacy/stock/${stockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ quantity: qtyVal })
      })
    } catch (err) {
      console.error("Inline stock edit failed:", err)
    }
  }

  const handleAddStock = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/pharmacy/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({
          medicine_name: medName,
          generic_name: genName,
          category,
          batch_id: batchId,
          quantity: parseInt(quantity),
          price: parseFloat(price),
          expiry_date: expiryDate
        })
      })

      if (res.ok) {
        setIsAddOpen(false)
        fetchPharmacyData()
      }
    } catch (err) {
      console.error("Add stock error:", err)
    }
  }

  const handleCsvUpload = async (e) => {
    e.preventDefault()
    if (!csvFile) return

    const formData = new FormData()
    formData.append('file', csvFile)

    try {
      const res = await fetch('/api/pharmacy/stock/upload-csv', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.access_token}` },
        body: formData
      })
      if (res.ok) {
        setIsCsvOpen(false)
        setCsvFile(null)
        fetchPharmacyData()
      }
    } catch (err) {
      console.error("CSV upload error:", err)
    }
  }

  const handleUpdatePrescriptionStatus = async (prescId, status) => {
    try {
      const res = await fetch(`/api/pharmacy/prescriptions/${prescId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ status, notes: `Pharmacist updated to ${status}` })
      })
      if (res.ok) fetchPharmacyData()
    } catch (err) {
      console.error("Prescription status update error:", err)
    }
  }

  const handlePosSubmit = async (e) => {
    e.preventDefault()
    setPosMsg('')
    try {
      const res = await fetch(`/api/pharmacy/stock/pos-decrement?barcode_id=${encodeURIComponent(posBarcode)}&sold_quantity=${posQty}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setPosMsg(`Success: ${data.message}`)
        fetchPharmacyData()
      } else {
        setPosMsg(`Error: ${data.detail}`)
      }
    } catch (err) {
      setPosMsg(`Error: ${err.message}`)
    }
  }

  const lowStockCount = stockList.filter(s => s.quantity <= 10).length
  const pendingPrescCount = prescriptions.filter(p => p.status === 'pending').length

  return (
    <div className="dashboard-container">
      {/* Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.75rem', fontWeight: '700', color: '#0f172a' }}>
            Pharmacy Inventory & Operations Dashboard
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Real-time stock edits sync instantly to patient search queries.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-outline" onClick={fetchPharmacyData}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn-outline" onClick={() => setIsCsvOpen(true)}>
            <Upload size={16} /> Bulk CSV Upload
          </button>
          <button className="btn-outline" onClick={() => setIsPosOpen(true)} style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
            <Scan size={16} /> POS Scanner Extension
          </button>
          <button className="btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} /> Add Stock Item
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}><Package size={24} /></div>
          <div>
            <div className="stat-val">{stockList.length}</div>
            <div className="stat-lbl">Total Inventory Items</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}><AlertCircle size={24} /></div>
          <div>
            <div className="stat-val">{lowStockCount}</div>
            <div className="stat-lbl">Low Stock Alerts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}><FileText size={24} /></div>
          <div>
            <div className="stat-val">{pendingPrescCount}</div>
            <div className="stat-lbl">Pending Prescriptions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#991b1b' }}><Star size={24} /></div>
          <div>
            <div className="stat-val">{feedbackList.length}</div>
            <div className="stat-lbl">Store Reviews</div>
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="data-table-card">
        <div className="table-header-toolbar">
          <h3 style={{ fontWeight: '700', color: '#0f172a' }}>Live Inventory Stock (Editable)</h3>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Changes to quantity directly decrement/increment patient live stock
          </span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Generic Salt</th>
                <th>Category</th>
                <th>Batch / Barcode</th>
                <th>Price (₹)</th>
                <th>Live Quantity</th>
                <th>Expiry Date</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {stockList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No stock inventory found. Click 'Add Stock Item' or 'Bulk CSV Upload' to populate stock.
                  </td>
                </tr>
              ) : (
                stockList.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>{item.medicine_name}</td>
                    <td style={{ color: '#64748b' }}>{item.generic_name}</td>
                    <td><span className="badge badge-generic">{item.category}</span></td>
                    <td><code>{item.batch_id}</code></td>
                    <td style={{ fontWeight: '700' }}>₹{item.price}</td>
                    <td>
                      <input
                        type="number"
                        className="inline-qty-input"
                        value={item.quantity}
                        onChange={(e) => handleInlineQuantityChange(item.id, e.target.value)}
                      />
                      {item.quantity <= 10 && (
                        <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '700', marginLeft: '0.4rem' }}>
                          LOW
                        </span>
                      )}
                    </td>
                    <td>{item.expiry_date}</td>
                    <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {new Date(item.last_updated).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prescription Verification Queue */}
      <div className="data-table-card">
        <div className="table-header-toolbar">
          <h3 style={{ fontWeight: '700', color: '#0f172a' }}>Patient Prescription Upload Queue</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Upload ID</th>
                <th>Patient ID</th>
                <th>Prescription Image</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                    No pending prescription uploads from patients.
                  </td>
                </tr>
              ) : (
                prescriptions.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>Patient #{p.patient_id}</td>
                    <td>
                      <a href={p.image_url} target="_blank" rel="noreferrer" style={{ color: '#059669', fontWeight: '600', textDecoration: 'underline' }}>
                        View Prescription Photo
                      </a>
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'verified' ? 'badge-in-stock' : p.status === 'rejected' ? 'badge-out-stock' : 'badge-low-stock'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{new Date(p.timestamp).toLocaleString()}</td>
                    <td>
                      {p.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn-outline" onClick={() => handleUpdatePrescriptionStatus(p.id, 'verified')} style={{ padding: '0.2rem 0.5rem', color: '#166534', borderColor: '#86efac' }}>
                            <CheckCircle size={14} /> Verify
                          </button>
                          <button className="btn-outline" onClick={() => handleUpdatePrescriptionStatus(p.id, 'rejected')} style={{ padding: '0.2rem 0.5rem', color: '#991b1b', borderColor: '#fca5a5' }}>
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Modal */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add / Restock Inventory</h3>
              <button className="close-btn" onClick={() => setIsAddOpen(false)}><XCircle size={20} /></button>
            </div>
            <form onSubmit={handleAddStock}>
              <div className="form-group">
                <label className="form-label">Medicine Name</label>
                <input type="text" className="form-control" value={medName} onChange={(e) => setMedName(e.target.value)} required placeholder="e.g. Dolo 650" />
              </div>
              <div className="form-group">
                <label className="form-label">Generic / Salt Name</label>
                <input type="text" className="form-control" value={genName} onChange={(e) => setGenName(e.target.value)} required placeholder="e.g. Paracetamol" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Fever & Pain">Fever & Pain</option>
                  <option value="Diabetes">Diabetes</option>
                  <option value="BP & Heart">BP & Heart</option>
                  <option value="Antibiotics">Antibiotics</option>
                  <option value="Baby Care">Baby Care</option>
                  <option value="Skin Care">Skin Care</option>
                  <option value="Digestive & Acidity">Digestive & Acidity</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Batch ID / Barcode</label>
                <input type="text" className="form-control" value={batchId} onChange={(e) => setBatchId(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input type="number" className="form-control" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input type="number" step="0.1" className="form-control" value={price} onChange={(e) => setPrice(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input type="date" className="form-control" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Save Stock Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {isCsvOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Bulk CSV / Excel Stock Upload</h3>
              <button className="close-btn" onClick={() => setIsCsvOpen(false)}><XCircle size={20} /></button>
            </div>
            <form onSubmit={handleCsvUpload}>
              <div className="form-group">
                <label className="form-label">Select CSV or Excel File</label>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="form-control"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  required
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                <strong>Required CSV Headers:</strong><br />
                <code>medicine_name, generic_name, category, batch_id, quantity, price, expiry_date</code>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Process Bulk Inventory Upload
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POS Barcode Scanner Extension Modal */}
      {isPosOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Scan size={20} className="text-emerald-600" /> POS Billing Barcode Decrement (Extension Ready)
              </h3>
              <button className="close-btn" onClick={() => setIsPosOpen(false)}><XCircle size={20} /></button>
            </div>
            <form onSubmit={handlePosSubmit}>
              <div className="form-group">
                <label className="form-label">Scan Barcode / Enter Batch ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. B-DOL-101"
                  value={posBarcode}
                  onChange={(e) => setPosBarcode(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sold Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  value={posQty}
                  onChange={(e) => setPosQty(e.target.value)}
                  required
                />
              </div>
              {posMsg && (
                <div style={{ fontSize: '0.82rem', padding: '0.5rem', borderRadius: '6px', background: posMsg.startsWith('Success') ? '#dcfce7' : '#fee2e2', color: posMsg.startsWith('Success') ? '#166534' : '#991b1b', marginBottom: '1rem' }}>
                  {posMsg}
                </div>
              )}
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Auto-Decrement Stock on Billing
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
