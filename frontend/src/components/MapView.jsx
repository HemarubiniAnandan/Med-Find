import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icon issues in Leaflet
const patientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const pharmacyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export default function MapView({ patientLocation, searchResults }) {
  const centerLat = patientLocation.lat || 12.9716
  const centerLng = patientLocation.lng || 77.5946

  return (
    <div className="map-container-box">
      <div className="map-header">
        <span>📍 Live Map View</span>
        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>
          {searchResults.length} Store Pins
        </span>
      </div>

      <div className="map-frame">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={12}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Patient Current Location Pin */}
          <Marker position={[centerLat, centerLng]} icon={patientIcon}>
            <Popup>
              <strong>Your Live Location</strong><br />
              {patientLocation.areaName || 'Bengaluru'}
            </Popup>
          </Marker>

          {/* Pharmacy Result Pins */}
          {searchResults.map((item, idx) => (
            <Marker
              key={idx}
              position={[item.latitude, item.longitude]}
              icon={pharmacyIcon}
            >
              <Popup>
                <div style={{ padding: '0.2rem' }}>
                  <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{item.pharmacy_name}</strong><br />
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.medicine_name} - ₹{item.price}</span><br />
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#059669' }}>
                    {item.distance_km} km away ({item.estimated_time_mins} mins)
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
