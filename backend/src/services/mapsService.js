import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371.0; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

export const calculateLiveDistance = async (originLat, originLng, destLat, destLng) => {
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;
      const res = await axios.get(url, { timeout: 4000 });
      if (res.status === 200 && res.data.status === 'OK') {
        const elem = res.data.rows?.[0]?.elements?.[0];
        if (elem && elem.status === 'OK') {
          const distKm = Number((elem.distance.value / 1000.0).toFixed(2));
          const durationMins = Math.ceil(elem.duration.value / 60.0);
          return {
            distance_km: distKm,
            estimated_time_mins: durationMins,
            source: 'google_maps_api'
          };
        }
      }
    } catch (e) {
      console.warn(`[MapsService] Google Maps API call error: ${e.message}`);
    }
  }

  // Fallback to simulated road distance (1.35x haversine factor for Indian city road layout)
  const haversineKm = calculateHaversineDistance(originLat, originLng, destLat, destLng);
  const roadDistanceKm = Number((haversineKm * 1.35).toFixed(2));
  // Estimate average speed 25 km/h in Indian urban areas
  const travelMins = Math.max(2, Math.ceil((roadDistanceKm / 25.0) * 60));
  return {
    distance_km: roadDistanceKm,
    estimated_time_mins: travelMins,
    source: 'haversine_fallback'
  };
};
