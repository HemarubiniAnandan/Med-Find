import os
import math
import requests
from dotenv import load_dotenv

load_dotenv()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates straight-line distance in kilometers using Haversine formula."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def calculate_live_distance(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> dict:
    """
    Calculates actual distance and travel time using Google Maps Distance Matrix API.
    Falls back gracefully to road factor augmented Haversine distance if API key is not supplied.
    """
    if GOOGLE_MAPS_API_KEY:
        try:
            url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={origin_lat},{origin_lng}&destinations={dest_lat},{dest_lng}&key={GOOGLE_MAPS_API_KEY}&mode=driving"
            res = requests.get(url, timeout=4)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "OK" and data["rows"][0]["elements"][0].get("status") == "OK":
                    elem = data["rows"][0]["elements"][0]
                    dist_km = round(elem["distance"]["value"] / 1000.0, 2)
                    duration_mins = math.ceil(elem["duration"]["value"] / 60.0)
                    return {
                        "distance_km": dist_km,
                        "estimated_time_mins": duration_mins,
                        "source": "google_maps_api"
                    }
        except Exception as e:
            print(f"[MapsService] Google Maps API call error: {e}")

    # Fallback to simulated road distance (1.35x haversine factor for Indian city road layout)
    haversine_km = calculate_haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
    road_distance_km = round(haversine_km * 1.35, 2)
    # Estimate average speed 25 km/h in Indian urban areas
    travel_mins = max(2, math.ceil((road_distance_km / 25.0) * 60))
    return {
        "distance_km": road_distance_km,
        "estimated_time_mins": travel_mins,
        "source": "haversine_fallback"
    }
